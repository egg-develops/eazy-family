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
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
