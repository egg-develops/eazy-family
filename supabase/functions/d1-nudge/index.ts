import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

type Lang = "en" | "de" | "fr" | "it" | "es" | "pt";

// D1 nudge: sent 23–25 hours after push token registration (= install proxy).
// Copy is intentionally concrete — tell them exactly what the voice button does.
const MSGS: Record<Lang, { title: string; body: string }> = {
  en: { title: "Still finding your way? 👋", body: "Long-press the EZ button and tell it what's on your mind — it'll sort it out." },
  de: { title: "Noch nicht losgelegt? 👋", body: "Halte den EZ-Button gedrückt und sag, was du brauchst — er erledigt den Rest." },
  fr: { title: "Pas encore essayé ? 👋", body: "Appuie longuement sur le bouton EZ et dis ce que tu as en tête — il s'en occupe." },
  it: { title: "Non hai ancora provato? 👋", body: "Tieni premuto il pulsante EZ e digli cosa hai in mente — ci pensa lui." },
  es: { title: "¿Todavía explorando? 👋", body: "Mantén pulsado el botón EZ y dile lo que tienes en mente — él se encarga." },
  pt: { title: "Ainda explorando? 👋", body: "Pressione o botão EZ e diga o que está pensando — ele cuida do resto." },
};

async function buildAPNsJWT(pem: string, keyId: string, teamId: string): Promise<string> {
  const pemBody = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const keyDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const b64u = (s: string) =>
    btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const hdr = b64u(JSON.stringify({ alg: "ES256", kid: keyId }));
  const pld = b64u(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const msg = `${hdr}.${pld}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(msg),
  );
  return `${msg}.${b64u(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function sendAPNs(token: string, title: string, body: string, jwt: string): Promise<number> {
  const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": "eazy.family.app",
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: "default" } }),
  });
  return res.status;
}

serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const privateKeyPem = Deno.env.get("APNS_PRIVATE_KEY");
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "PU6P37HYB9";

  if (!privateKeyPem || !keyId) {
    return new Response(
      JSON.stringify({ error: "APNS_PRIVATE_KEY and APNS_KEY_ID secrets required" }),
      { status: 503 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Target: tokens registered 23–25 hours ago (2-hour window, cron runs hourly)
  const now = Date.now();
  const windowStart = new Date(now - 25 * 3_600_000).toISOString();
  const windowEnd = new Date(now - 23 * 3_600_000).toISOString();

  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .eq("platform", "ios")
    .gte("created_at", windowStart)
    .lte("created_at", windowEnd);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!tokens?.length) return new Response(JSON.stringify({ sent: 0, window: { windowStart, windowEnd } }), { status: 200 });

  const userIds = tokens.map((t) => t.user_id);
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("user_id, data")
    .in("user_id", userIds);

  const langByUser = new Map<string, Lang>(
    (prefs ?? []).map((p) => [p.user_id, (p.data?.["eazy-family-language"] ?? "en") as Lang]),
  );

  const jwt = await buildAPNsJWT(privateKeyPem, keyId, teamId);

  let sent = 0;
  const staleUsers: string[] = [];

  for (const { user_id, token } of tokens) {
    const lang = langByUser.get(user_id) ?? "en";
    const msg = MSGS[lang] ?? MSGS.en;
    const status = await sendAPNs(token, msg.title, msg.body, jwt);
    if (status === 200) {
      sent++;
    } else if (status === 410) {
      staleUsers.push(user_id);
    }
  }

  if (staleUsers.length) {
    await supabase.from("push_tokens").delete().in("user_id", staleUsers).eq("platform", "ios");
  }

  return new Response(
    JSON.stringify({ sent, stale: staleUsers.length, total: tokens.length }),
    { status: 200 },
  );
});
