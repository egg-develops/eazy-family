import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// RevenueCat event types that activate or maintain premium access
const ACTIVATE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "TRIAL_STARTED",
  "TRIAL_CONVERTED",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
]);

// RevenueCat event types that confirm access has fully ended
const EXPIRE_EVENTS = new Set([
  "EXPIRATION",
]);

// CANCELLATION and TRIAL_CANCELLED are intentionally ignored here —
// the user still has active access until the period ends, and EXPIRATION
// fires when access actually lapses.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // RevenueCat sends a shared secret in the Authorization header.
  // Configure the value at: RevenueCat Dashboard → Project → Integrations → Webhooks
  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (webhookSecret) {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== webhookSecret) {
      console.error("RC webhook: invalid Authorization header");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const event = body?.event;
  if (!event?.type || !event?.app_user_id) {
    // Not a valid RC event payload — return 200 so RC doesn't retry
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const eventType: string = event.type;
  const userId: string = event.app_user_id;

  // RC aliases can map to non-UUID strings (anonymous IDs starting with $RCAnonymousID).
  // Only process events where app_user_id looks like a Supabase UUID.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(userId)) {
    console.log(`RC webhook: skipping anonymous user ${userId}`);
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let newTier: string | null = null;

  if (ACTIVATE_EVENTS.has(eventType)) {
    newTier = "family";
  } else if (EXPIRE_EVENTS.has(eventType)) {
    newTier = "free";
  } else {
    // Non-actionable event (CANCELLATION, BILLING_ISSUE, etc.) — acknowledge and move on
    console.log(`RC webhook: no-op for event type ${eventType} (user ${userId})`);
    return new Response(JSON.stringify({ received: true, action: "none" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }

  const { error, count } = await supabase
    .from("profiles")
    .update({ subscription_tier: newTier })
    .eq("user_id", userId)
    .select();

  if (error) {
    console.error(`RC webhook: failed to update profile for ${userId}:`, error.message);
    return new Response(JSON.stringify({ error: "DB update failed" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  if (!count || count === 0) {
    console.warn(`RC webhook: no profile found for user_id ${userId} (event: ${eventType})`);
  } else {
    console.log(`RC webhook: set subscription_tier="${newTier}" for user ${userId} (event: ${eventType})`);
  }

  return new Response(JSON.stringify({ received: true, action: newTier }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
