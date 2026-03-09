import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  updated: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) throw new Error("No authorization code provided");

    const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");
    const redirectUri = Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI") || 
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-oauth-callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(`Google token exchange failed: ${error.error_description}`);
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Get user's Google account info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get Google user info");
    }

    const userInfo = await userInfoResponse.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Store the integration in the database
    const { data: integrationData, error: integrationError } = await supabaseClient
      .from("calendar_integrations")
      .upsert({
        user_id: user.id,
        provider: "google",
        provider_account_id: userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        is_active: true,
      })
      .select();

    if (integrationError) throw integrationError;

    // Fetch Google Calendar events and sync them
    if (integrationData && integrationData.length > 0) {
      const integration = integrationData[0];
      
      // Get events from primary calendar
      const eventsResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100&showDeleted=false&singleEvents=true&orderBy=startTime",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.items || [];

        // Insert or update synced events
        const syncedEvents = events.map((event: GoogleCalendarEvent) => ({
          user_id: user.id,
          integration_id: integration.id,
          google_event_id: event.id,
          title: event.summary,
          description: event.description || null,
          location: event.location || null,
          start_date: event.start.dateTime || event.start.date,
          end_date: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime, // If no dateTime, it's an all-day event
          google_last_modified: event.updated,
          is_active: true,
        }));

        if (syncedEvents.length > 0) {
          const { error: syncError } = await supabaseClient
            .from("synced_calendar_events")
            .upsert(syncedEvents, { onConflict: "user_id,google_event_id" });

          if (syncError) console.error("Sync error:", syncError);
        }
      }

      // Update last_synced_at
      await supabaseClient
        .from("calendar_integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", integration.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Calendar connected successfully",
        integration: integrationData?.[0],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OAuth callback failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
