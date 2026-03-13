import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitializeRequest {
  action: "check" | "create" | "validate";
  coupon_code?: string;
}

interface StripeError {
  error: {
    code: string;
    message: string;
  };
}

async function checkOrCreateStripeCoupon() {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const desiredCouponId = Deno.env.get("STRIPE_REFERRAL_COUPON_ID");

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable not set");
  }

  if (!desiredCouponId) {
    console.warn("STRIPE_REFERRAL_COUPON_ID not set in environment. Creating one now...");
    return await createNewStripeCoupon(stripeSecretKey);
  }

  // Check if coupon exists
  console.log(`Checking if coupon ${desiredCouponId} exists...`);
  const coupon = await fetchStripeCoupon(stripeSecretKey, desiredCouponId);

  if (coupon) {
    console.log(`Coupon ${desiredCouponId} already exists:`, coupon);
    return {
      exists: true,
      coupon_id: coupon.id,
      percent_off: coupon.percent_off,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      metadata: coupon.metadata,
    };
  } else {
    console.log(`Coupon ${desiredCouponId} does not exist. Creating...`);
    return await createNewStripeCoupon(stripeSecretKey, desiredCouponId);
  }
}

async function fetchStripeCoupon(
  stripeSecretKey: string,
  couponId: string
): Promise<any> {
  try {
    const response = await fetch(`https://api.stripe.com/v1/coupons/${couponId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = (await response.json()) as StripeError;
      throw new Error(`Stripe API error: ${error.error.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching coupon:", error);
    throw error;
  }
}

async function createNewStripeCoupon(
  stripeSecretKey: string,
  couponId?: string
): Promise<any> {
  const params = new URLSearchParams({
    percent_off: "100",
    duration: "limited",
    duration_in_months: "1",
    name: "Referral Reward - 100% Off",
  });

  if (couponId) {
    params.append("id", couponId);
  }

  try {
    const response = await fetch("https://api.stripe.com/v1/coupons", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = (await response.json()) as StripeError;
      throw new Error(`Failed to create coupon: ${error.error.message}`);
    }

    const coupon = await response.json();
    console.log("Created new coupon:", coupon);

    return {
      created: true,
      coupon_id: coupon.id,
      percent_off: coupon.percent_off,
      duration: coupon.duration,
      duration_in_months: coupon.duration_in_months,
      message: `Coupon ${coupon.id} created successfully. Store this ID as STRIPE_REFERRAL_COUPON_ID in Supabase Secrets.`,
    };
  } catch (error) {
    console.error("Error creating coupon:", error);
    throw error;
  }
}

async function validateStripeCoupon(couponId: string) {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable not set");
  }

  const coupon = await fetchStripeCoupon(stripeSecretKey, couponId);

  if (!coupon) {
    throw new Error(`Coupon ${couponId} not found in Stripe`);
  }

  // Validate it's configured correctly
  const isValid =
    coupon.percent_off === 100 &&
    coupon.duration === "limited" &&
    coupon.duration_in_months === 1;

  return {
    coupon_id: coupon.id,
    valid: isValid,
    percent_off: coupon.percent_off,
    duration: coupon.duration,
    duration_in_months: coupon.duration_in_months,
    created: coupon.created,
    max_redemptions: coupon.max_redemptions || "unlimited",
    message: isValid
      ? `Coupon ${coupon.id} is correctly configured for referral rewards.`
      : `Coupon ${coupon.id} exists but configuration does not match expected (100% off, 1 month).`,
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { action, coupon_code } = body as InitializeRequest;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' parameter (check|create|validate)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result;

    switch (action) {
      case "check":
        result = await checkOrCreateStripeCoupon();
        break;

      case "create":
        result = await createNewStripeCoupon(
          Deno.env.get("STRIPE_SECRET_KEY")!,
          coupon_code
        );
        break;

      case "validate":
        if (!coupon_code) {
          throw new Error("'coupon_code' parameter required for validate action");
        }
        result = await validateStripeCoupon(coupon_code);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in initialize-stripe-coupon:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
