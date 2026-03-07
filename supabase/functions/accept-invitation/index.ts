import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://xizquwqsthjjjkujwivt.supabase.co';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { invitation_token } = await req.json();
    
    if (!invitation_token) {
      throw new Error('Invitation token is required');
    }

    // Validate invitation token expiration (7 days)
    const { data: invitation, error: inviteCheckError } = await supabaseClient
      .from('family_invitations')
      .select('created_at, accepted_at')
      .eq('invitation_token', invitation_token)
      .maybeSingle();

    if (inviteCheckError) {
      throw new Error('Failed to verify invitation');
    }

    if (!invitation) {
      throw new Error('token_invalid');
    }

    if (invitation.accepted_at) {
      throw new Error('token_already_used');
    }

    // Check if invitation has expired (7 days = 604800 seconds)
    const createdAt = new Date(invitation.created_at).getTime();
    const nowMs = Date.now();
    const expirationMs = 7 * 24 * 60 * 60 * 1000;
    
    if (nowMs - createdAt > expirationMs) {
      throw new Error('token_expired');
    }

    // Use the database function to securely accept the invitation
    const { data, error } = await supabaseClient.rpc('accept_family_invitation', {
      _invitation_token: invitation_token,
      _accepting_user_id: user.id,
    });

    if (error) {
      throw error;
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to accept invitation');
    }

    return new Response(
      JSON.stringify({ success: true, family_id: data.family_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMsg === 'token_invalid' || errorMsg === 'token_expired' || errorMsg === 'token_already_used' ? 400 : 400;
    
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: statusCode }
    );
  }
});
