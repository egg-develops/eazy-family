import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { error } = await admin
    .from("shopping_purchase_history")
    .delete()
    .gte("created_at", "2000-01-01");
  return new Response(
    JSON.stringify({ success: !error, error: error?.message }),
    { headers: { "Content-Type": "application/json" } }
  );
});
