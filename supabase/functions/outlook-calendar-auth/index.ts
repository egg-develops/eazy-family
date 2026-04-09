import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('AZURE_CLIENT_ID') || Deno.env.get('OUTLOOK_CLIENT_ID');
    if (!clientId) throw new Error('Outlook Client ID not configured (set AZURE_CLIENT_ID in secrets)');

    const { action, code, redirect_uri } = await req.json();

    // ── 0. Build admin consent URL (for orgs that require IT approval) ─────────
    if (action === 'get_admin_consent_url') {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri,
        scope: 'https://graph.microsoft.com/Calendars.Read offline_access',
        state: 'outlook_admin_consent',
      });
      const url = `https://login.microsoftonline.com/organizations/v2.0/adminconsent?${params}`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 1. Build auth URL ──────────────────────────────────────────────────────
    if (action === 'get_auth_url') {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri,
        response_type: 'code',
        response_mode: 'query',
        scope: 'openid email profile Calendars.Read offline_access',
        state: 'outlook_calendar_sync',
        prompt: 'select_account',
      });
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Exchange code for tokens, fetch events ──────────────────────────────
    if (action === 'exchange_code') {
      const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET') || Deno.env.get('OUTLOOK_CLIENT_SECRET');
      if (!clientSecret) throw new Error('Outlook Client Secret not configured (set AZURE_CLIENT_SECRET in secrets)');

      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri,
          grant_type: 'authorization_code',
          scope: 'openid email profile Calendars.Read offline_access',
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      // Persist refresh token so the user never needs to reconnect
      if (tokenData.refresh_token) {
        await supabase
          .from('profiles')
          .update({ outlook_refresh_token: tokenData.refresh_token })
          .eq('user_id', user.id);
      }

      const events = await fetchOutlookEvents(tokenData.access_token);
      return new Response(JSON.stringify({ events, synced: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Re-sync using stored refresh token ──────────────────────────────────
    if (action === 'resync') {
      const clientSecret = Deno.env.get('AZURE_CLIENT_SECRET') || Deno.env.get('OUTLOOK_CLIENT_SECRET');
      if (!clientSecret) throw new Error('Outlook Client Secret not configured (set AZURE_CLIENT_SECRET in secrets)');

      const { data: profile } = await supabase
        .from('profiles')
        .select('outlook_refresh_token')
        .eq('user_id', user.id)
        .single();

      if (!profile?.outlook_refresh_token) {
        throw new Error('No stored token — please reconnect Outlook');
      }

      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: profile.outlook_refresh_token,
          scope: 'Calendars.Read offline_access',
        }),
      });
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        // Token revoked — clear it so the UI shows "reconnect"
        await supabase
          .from('profiles')
          .update({ outlook_refresh_token: null })
          .eq('user_id', user.id);
        throw new Error('Outlook session expired. Please reconnect.');
      }

      // Rotate the stored refresh token if Microsoft issued a new one
      if (tokenData.refresh_token) {
        await supabase
          .from('profiles')
          .update({ outlook_refresh_token: tokenData.refresh_token })
          .eq('user_id', user.id);
      }

      const events = await fetchOutlookEvents(tokenData.access_token);
      return new Response(JSON.stringify({ events, synced: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Disconnect — clear stored token ────────────────────────────────────
    if (action === 'disconnect') {
      await supabase
        .from('profiles')
        .update({ outlook_refresh_token: null })
        .eq('user_id', user.id);
      return new Response(JSON.stringify({ disconnected: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Outlook auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchOutlookEvents(accessToken: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end   = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=100&$select=id,subject,start,end,isAllDay,location,bodyPreview&$orderby=start/dateTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return (data.value || []).map((item: any) => ({
    id: item.id,
    title: item.subject || 'Untitled',
    start: item.start?.dateTime,
    end:   item.end?.dateTime,
    description: item.bodyPreview || '',
    location: item.location?.displayName || '',
    allDay: item.isAllDay || false,
  }));
}
