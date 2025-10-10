import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { promo_code } = await req.json();
    if (!promo_code) throw new Error("Promo code is required");

    const normalizedCode = promo_code.trim().toUpperCase();

    // Validate promo code from database
    const { data: promoData, error: promoError } = await supabaseClient
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (promoError) throw promoError;

    if (!promoData) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid promo code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if promo code has expired
    if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Promo code has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if max uses reached
    if (promoData.max_uses && promoData.current_uses >= promoData.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: "Promo code has reached maximum uses" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Update user's subscription tier
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ subscription_tier: promoData.subscription_tier })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Increment promo code usage count
    await supabaseClient
      .from("promo_codes")
      .update({ 
        current_uses: promoData.current_uses + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", promoData.id);

    return new Response(
      JSON.stringify({ valid: true, subscription_tier: promoData.subscription_tier }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error validating promo code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
