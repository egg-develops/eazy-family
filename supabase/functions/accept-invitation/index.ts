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
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
