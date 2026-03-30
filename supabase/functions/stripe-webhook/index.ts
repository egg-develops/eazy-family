import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && session.customer) {
        const customerId = session.customer as string;

        // Update user's subscription tier using stripe_customer_id
        const { error, count } = await supabaseClient
          .from("profiles")
          .update({ subscription_tier: "family" })
          .eq("stripe_customer_id", customerId)
          .select();

        if (error || !count || count === 0) {
          console.error(`Failed to update subscription for customer ${customerId}:`, error || "No rows matched");
          return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
        } else {
          console.log(`Subscription activated for customer ${customerId}`);
        }

        // Apply referral reward to referrer if applicable
        const subscriptionMeta = (session.subscription_data as any)?.metadata ?? (session as any).metadata ?? {};
        const referralId = subscriptionMeta?.referral_id;
        const referrerUserId = subscriptionMeta?.referrer_user_id;
        const referralCouponId = Deno.env.get("STRIPE_REFERRAL_COUPON_ID");

        if (referralId && referrerUserId && referralCouponId) {
          try {
            // Get referrer's Stripe customer ID
            const { data: referrerProfile } = await supabaseClient
              .from("profiles")
              .select("stripe_customer_id")
              .eq("user_id", referrerUserId)
              .maybeSingle();

            if (referrerProfile?.stripe_customer_id) {
              // Find referrer's active subscription and apply coupon
              const referrerSubscriptions = await stripe.subscriptions.list({
                customer: referrerProfile.stripe_customer_id,
                status: "active",
                limit: 1,
              });

              if (referrerSubscriptions.data.length > 0) {
                await stripe.subscriptions.update(referrerSubscriptions.data[0].id, {
                  discounts: [{ coupon: referralCouponId }],
                });
                console.log(`Applied referral coupon to referrer ${referrerUserId}`);
              }
            }

            // Mark referral as reward applied
            await supabaseClient
              .from("referrals")
              .update({ reward_applied: true })
              .eq("id", referralId);
          } catch (refErr) {
            console.error("Error applying referral reward:", refErr);
          }
        }
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Activate subscription on creation or update
      const { error, count } = await supabaseClient
        .from("profiles")
        .update({ subscription_tier: "family" })
        .eq("stripe_customer_id", customerId)
        .select();

      if (error || !count || count === 0) {
        console.error(`Failed to update subscription for customer ${customerId}:`, error || "No rows matched");
        return new Response(JSON.stringify({ error: "Update failed" }), { status: 500 });
      } else {
        console.log(`Subscription updated for customer ${customerId}`);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Downgrade user to free tier using stripe_customer_id
      const { error, count } = await supabaseClient
        .from("profiles")
        .update({ subscription_tier: "free" })
        .eq("stripe_customer_id", customerId)
        .select();

      if (error || !count || count === 0) {
        console.error(`Failed to downgrade subscription for customer ${customerId}:`, error || "No rows matched");
        return new Response(JSON.stringify({ error: "Downgrade failed" }), { status: 500 });
      } else {
        console.log(`Subscription cancelled for customer ${customerId}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }
});
