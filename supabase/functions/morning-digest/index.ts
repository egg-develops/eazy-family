import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  // Protect against arbitrary callers using a shared CRON_SECRET
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "No Resend key" }), { status: 500 });
  }

  // Date range for "today" in Europe/Zurich
  const now = new Date();
  const zurichOffset = getZurichOffsetMs(now);
  const zurichNow = new Date(now.getTime() + zurichOffset);
  const todayStartZurich = new Date(Date.UTC(
    zurichNow.getUTCFullYear(), zurichNow.getUTCMonth(), zurichNow.getUTCDate()
  ));
  const todayEndZurich = new Date(todayStartZurich.getTime() + 86400000);
  // Convert back to UTC for DB queries
  const todayStartUTC = new Date(todayStartZurich.getTime() - zurichOffset);
  const todayEndUTC = new Date(todayEndZurich.getTime() - zurichOffset);

  // Find all users who have morning digest enabled in user_preferences
  const { data: prefRows, error: prefErr } = await supabase
    .from("user_preferences")
    .select("user_id, data");

  if (prefErr) {
    console.error("Preferences fetch error:", prefErr);
    return new Response(JSON.stringify({ error: prefErr.message }), { status: 500 });
  }

  const digestUsers = (prefRows ?? []).filter(
    (row) => row.data?.["eazy-morning-digest"] === "true"
  );

  if (digestUsers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no opt-ins" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const { user_id, data } of digestUsers) {
    const emailEnabled = data?.["eazy-morning-digest-email"] === "true";
    if (!emailEnabled) continue;

    // Get profile email + name
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile?.email) continue;

    // Today's events
    const { data: events } = await supabase
      .from("events")
      .select("title, start_date, end_date, all_day, location")
      .eq("user_id", user_id)
      .gte("start_date", todayStartUTC.toISOString())
      .lt("start_date", todayEndUTC.toISOString())
      .order("start_date");

    // Open tasks (not shopping)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, due_date, type")
      .eq("user_id", user_id)
      .eq("completed", false)
      .not("type", "ilike", "shopping%")
      .order("due_date", { ascending: true })
      .limit(6);

    const firstName = profile.full_name?.split(" ")[0] || "there";
    const dayLabel = zurichNow.toLocaleDateString("en-CH", {
      weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Zurich",
    });

    const html = buildDigestEmail(firstName, dayLabel, events ?? [], tasks ?? []);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Eazy.Family <digest@eazy.family>",
        to: [profile.email],
        subject: `Good morning, ${firstName} ☀️ — Your family's day`,
        html,
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      const err = await res.text();
      console.error(`Resend error for ${profile.email}:`, err);
      errors.push(err);
    }
  }

  return new Response(JSON.stringify({ sent, errors: errors.length ? errors : undefined }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Returns Zurich offset in ms (handles CET/CEST automatically)
function getZurichOffsetMs(date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const zurichStr = date.toLocaleString("en-US", { timeZone: "Europe/Zurich" });
  const utcDate = new Date(utcStr);
  const zurichDate = new Date(zurichStr);
  return zurichDate.getTime() - utcDate.getTime();
}

function formatEventTime(isoStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-CH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich",
  });
}

function buildDigestEmail(
  firstName: string,
  dayLabel: string,
  events: Array<{ title: string; start_date: string; all_day: boolean; location?: string }>,
  tasks: Array<{ title: string; due_date?: string }>
): string {
  const eventsHtml =
    events.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">Nothing scheduled — enjoy the breathing room.</p>`
      : events
          .map(
            (e) => `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div style="width:52px;flex-shrink:0;text-align:right;color:#964735;font-size:12px;font-weight:600;padding-top:2px;line-height:1.4">
            ${formatEventTime(e.start_date, e.all_day)}
          </div>
          <div style="flex:1;border-left:2px solid #DAC1BB;padding-left:12px">
            <div style="color:#1C1C18;font-size:14px;font-weight:600;line-height:1.4">${e.title}</div>
            ${e.location ? `<div style="color:#7A6660;font-size:12px;margin-top:2px">📍 ${e.location}</div>` : ""}
          </div>
        </div>`
          )
          .join("");

  const tasksHtml =
    tasks.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">Nothing open — you're ahead of it.</p>`
      : tasks
          .map(
            (t) => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid #DAC1BB;flex-shrink:0;background:#FAF7F3"></div>
          <span style="color:#1C1C18;font-size:14px">${t.title}</span>
        </div>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Morning Digest</title>
</head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px">

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:28px">
      <img src="https://eazy.family/logo.png" alt="Eazy.Family" style="width:44px;height:44px;border-radius:12px">
      <p style="color:#7A6660;font-size:12px;margin:8px 0 0;letter-spacing:0.04em;text-transform:uppercase">Morning Digest · ${dayLabel}</p>
    </div>

    <!-- Greeting card -->
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px 24px 20px;margin-bottom:12px">
      <h1 style="color:#1C1C18;font-size:22px;margin:0 0 8px;font-weight:700;line-height:1.2">Good morning, ${firstName} ☀️</h1>
      <p style="color:#7A6660;font-size:14px;line-height:1.6;margin:0">
        Here's what your family has on today. You're already doing something wonderful — you showed up.
      </p>
    </div>

    <!-- Today's schedule -->
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:8px;height:8px;border-radius:50%;background:#964735;flex-shrink:0"></div>
        <span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Today's Schedule</span>
      </div>
      ${eventsHtml}
    </div>

    <!-- Open tasks -->
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="width:8px;height:8px;border-radius:50%;background:#44664F;flex-shrink:0"></div>
        <span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Open Tasks</span>
      </div>
      ${tasksHtml}
    </div>

    <!-- Rituals nudge -->
    <div style="background:#EEF4F0;border:1px solid #C8DDD0;border-radius:20px;padding:20px;margin-bottom:24px">
      <p style="color:#44664F;font-size:13px;line-height:1.7;margin:0">
        <strong style="color:#2D4F38">A quiet moment:</strong> The small things — a hug, a shared meal, five minutes without a screen — those are the ones they'll remember. Whatever today holds, you're already giving them that.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px">
      <a href="https://eazy.family/app" style="display:inline-block;background:linear-gradient(135deg,#964735,#D97B66);color:#ffffff;font-weight:600;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em">
        Open Eazy.Family →
      </a>
    </div>

    <!-- Footer -->
    <p style="color:#DAC1BB;font-size:11px;text-align:center;margin:0;line-height:1.6">
      © ${new Date().getFullYear()} Eazy.Family &nbsp;·&nbsp;
      <a href="https://eazy.family/app/settings" style="color:#DAC1BB;text-decoration:none">Manage digest</a>
      &nbsp;·&nbsp;
      <a href="https://eazy.family/privacy" style="color:#DAC1BB;text-decoration:none">Privacy</a>
    </p>

  </div>
</body>
</html>`;
}
