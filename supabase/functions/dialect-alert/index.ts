import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const THRESHOLD = 3;     // corrections to trigger an alert
const WINDOW_DAYS = 7;   // look-back window

interface ParseEventRow {
  raw_input: string;
  ai_result: { type?: string };
  final_result: { type?: string };
}

interface PatternGroup {
  count: number;
  aiTypes: Set<string>;
  finalTypes: Set<string>;
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("parse_events")
    .select("raw_input, ai_result, final_result")
    .eq("locale", "de-CH")
    .eq("was_corrected", true)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Query error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({ status: "no de-CH corrections in window", sent: false }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Group by normalised raw_input
  const groups = new Map<string, PatternGroup>();
  for (const row of rows as ParseEventRow[]) {
    const key = (row.raw_input ?? "").toLowerCase().trim();
    if (!key) continue;
    const g = groups.get(key) ?? { count: 0, aiTypes: new Set(), finalTypes: new Set() };
    g.count += 1;
    if (row.ai_result?.type) g.aiTypes.add(row.ai_result.type);
    if (row.final_result?.type) g.finalTypes.add(row.final_result.type);
    groups.set(key, g);
  }

  const patterns = [...groups.entries()]
    .filter(([, g]) => g.count >= THRESHOLD)
    .sort(([, a], [, b]) => b.count - a.count);

  if (patterns.length === 0) {
    return new Response(
      JSON.stringify({ status: "no patterns above threshold", totalCorrections: rows.length, sent: false }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Build actionable alert message
  const patternLines = patterns.map(([input, g], i) => {
    const aiType = [...g.aiTypes].join("/") || "unknown";
    const finalType = [...g.finalTypes].join("/") || "unknown";
    const typeLine = aiType !== finalType
      ? `AI: ${aiType} → User corrected to: ${finalType}`
      : `Both: ${finalType}`;
    return `${i + 1}. "${input}"  (${g.count}× corrected)\n   ${typeLine}`;
  }).join("\n\n");

  const dashboardUrl = `https://supabase.com/dashboard/project/${
    (Deno.env.get("SUPABASE_URL") ?? "").replace("https://", "").replace(".supabase.co", "")
  }/editor`;

  const message =
    `🇨🇭 Swiss German alert — ${patterns.length} pattern${patterns.length > 1 ? "s" : ""} need normalization` +
    ` (${rows.length} total corrections this week)\n\n` +
    patternLines +
    `\n\nFix: INSERT INTO dialect_normalizations (locale, pattern, replacement, notes)` +
    `\n→ Dashboard: ${dashboardUrl}`;

  let sent = false;

  // ── Telegram ──────────────────────────────────────────────────────────────
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
        }
      );
      if (tgRes.ok) sent = true;
      else console.error("Telegram error:", await tgRes.text());
    } catch (err) {
      console.error("Telegram fetch error:", err);
    }
  }

  // ── Email fallback ─────────────────────────────────────────────────────────
  const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "ermiasgiovanni@gmail.com";
  const subject = `🇨🇭 ${patterns.length} Swiss German pattern${patterns.length > 1 ? "s" : ""} need normalization`;

  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

  if (!sent && SENDGRID_API_KEY) {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
          from: { email: "noreply@eazy.family", name: "Eazy.Family" },
          subject,
          content: [{ type: "text/plain", value: message }],
        }),
      });
      sent = true;
    } catch (err) {
      console.error("SendGrid error:", err);
    }
  } else if (!sent && BREVO_API_KEY) {
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { email: "noreply@eazy.family", name: "Eazy.Family" },
          to: [{ email: ADMIN_EMAIL }],
          subject,
          textContent: message,
        }),
      });
      sent = true;
    } catch (err) {
      console.error("Brevo error:", err);
    }
  }

  return new Response(
    JSON.stringify({ status: "ok", patterns: patterns.length, totalCorrections: rows.length, sent }),
    { headers: { "Content-Type": "application/json" } }
  );
});
