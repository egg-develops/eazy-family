import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return respond({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const uid = user.id;

  // Explicit deletes for tables without CASCADE to auth.users.
  // (Tables with ON DELETE CASCADE on auth.users are handled by deleteUser below.)
  const cleanups: Array<[string, string]> = [
    ["events", "user_id"],
    ["photos", "user_id"],
    ["group_members", "user_id"],
    ["marketplace_items", "user_id"],
    ["family_members", "user_id"],
  ];

  for (const [table, col] of cleanups) {
    const { error } = await admin.from(table).delete().eq(col, uid);
    if (error) console.error(`delete-account: cleanup ${table} failed:`, error.message);
  }

  // Referrals — user may appear as either side
  await admin.from("referrals").delete().eq("referrer_user_id", uid);
  await admin.from("referrals").delete().eq("referred_user_id", uid);

  // Families the user created (no FK to auth.users — orphan cleanup)
  await admin.from("families").delete().eq("created_by", uid);

  // Profile delete triggers its own cascade chain
  const { error: profileErr } = await admin.from("profiles").delete().eq("user_id", uid);
  if (profileErr) {
    console.error("delete-account: profiles delete failed:", profileErr.message);
    return respond({ error: `Profile deletion failed: ${profileErr.message}` }, 500);
  }

  // Finally remove the auth user — cascades tasks, preferences, messages, etc.
  const { error: authErr } = await admin.auth.admin.deleteUser(uid);
  if (authErr) {
    console.error("delete-account: auth deleteUser failed:", authErr.message);
    return respond({ error: `Auth deletion failed: ${authErr.message}` }, 500);
  }

  return respond({ success: true });
});
