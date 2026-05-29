import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  // Date range for today in Europe/Zurich
  const now = new Date();
  const zurichOffset = getZurichOffsetMs(now);
  const zurichNow = new Date(now.getTime() + zurichOffset);
  const todayStartZurich = new Date(Date.UTC(
    zurichNow.getUTCFullYear(), zurichNow.getUTCMonth(), zurichNow.getUTCDate()
  ));
  const todayEndZurich = new Date(todayStartZurich.getTime() + 86400000);
  const weekAheadZurich = new Date(todayStartZurich.getTime() + 7 * 86400000);
  const todayStartUTC = new Date(todayStartZurich.getTime() - zurichOffset);
  const todayEndUTC = new Date(todayEndZurich.getTime() - zurichOffset);
  const weekAheadUTC = new Date(weekAheadZurich.getTime() - zurichOffset);

  const { data: prefRows, error: prefErr } = await supabase
    .from("user_preferences")
    .select("user_id, data");

  if (prefErr) {
    return new Response(JSON.stringify({ error: prefErr.message }), { status: 500 });
  }

  const isTruthy = (v: unknown) => v === true || v === "true";

  const digestUsers = (prefRows ?? []).filter(
    (row) => isTruthy(row.data?.["eazy-morning-digest"])
  );

  if (digestUsers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no opt-ins" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const { user_id, data } of digestUsers) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile) continue;

    // Use auth email as fallback if profiles.email is missing
    let recipientEmail = profile.email;
    if (!recipientEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
      recipientEmail = authUser?.user?.email ?? null;
    }
    if (!recipientEmail) continue;

    const SENDER_EMAIL = "hello@eazy.family";

    const [eventsRes, tasksRes, staleTasksRes, upcomingEventsRes] = await Promise.all([
      supabase
        .from("events")
        .select("title, start_date, end_date, all_day, location")
        .eq("user_id", user_id)
        .gte("start_date", todayStartUTC.toISOString())
        .lt("start_date", todayEndUTC.toISOString())
        .order("start_date"),
      supabase
        .from("tasks")
        .select("title, due_date, updated_at")
        .eq("user_id", user_id)
        .eq("completed", false)
        .not("type", "ilike", "shopping%")
        .order("due_date", { ascending: true })
        .limit(8),
      supabase
        .from("tasks")
        .select("title, updated_at")
        .eq("user_id", user_id)
        .eq("completed", false)
        .eq("type", "task")
        .lte("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("updated_at")
        .limit(3),
      supabase
        .from("events")
        .select("title, start_date, end_date, all_day, location")
        .eq("user_id", user_id)
        .gte("start_date", todayEndUTC.toISOString())
        .lt("start_date", weekAheadUTC.toISOString())
        .eq("all_day", false)
        .order("start_date")
        .limit(20),
    ]);

    const todayEvents = eventsRes.data ?? [];
    const openTasks = tasksRes.data ?? [];
    const staleTasks = staleTasksRes.data ?? [];
    const upcomingEvents = upcomingEventsRes.data ?? [];

    type EvtRow = { title: string; start_date: string; end_date?: string | null };
    const conflicts = detectConflicts(upcomingEvents as EvtRow[]);

    const firstName = profile.full_name?.split(" ")[0] || "there";
    const dayLabel = zurichNow.toLocaleDateString("en-CH", {
      weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Zurich",
    });

    let aiNarrative = "";
    if (ANTHROPIC_API_KEY) {
      aiNarrative = await generateAINarrative({
        apiKey: ANTHROPIC_API_KEY,
        firstName,
        dayLabel,
        todayEvents,
        openTasks,
        staleTasks,
        conflicts,
      });
    }

    let userSent = false;

    // ── Telegram ──────────────────────────────────────────────────────────
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const msg = buildTelegramMessage({ firstName, dayLabel, todayEvents, tasks: openTasks.slice(0, 6), staleTasks, conflicts, aiNarrative });
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      if (tgRes.ok) {
        userSent = true;
      } else {
        const err = await tgRes.text();
        console.error("Telegram error:", err);
        errors.push(`telegram: ${err}`);
      }
    }

    // ── Email (SendGrid preferred, Brevo fallback) ────────────────────────
    const emailEnabled = isTruthy(data?.["eazy-morning-digest-email"]);
    if (emailEnabled && recipientEmail) {
      const html = buildDigestEmail({ firstName, dayLabel, events: todayEvents, tasks: openTasks.slice(0, 6), staleTasks, conflicts, aiNarrative });
      const subject = `Good morning, ${firstName} ☀️ — Your family's day`;

      if (SENDGRID_API_KEY) {
        const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail, name: firstName }] }],
            from: { email: SENDER_EMAIL, name: "Eazy.Family" },
            subject,
            content: [{ type: "text/html", value: html }],
          }),
        });
        if (sgRes.ok || sgRes.status === 202) {
          userSent = true;
        } else {
          const err = await sgRes.text();
          console.error(`SendGrid error for ${recipientEmail}:`, err);
          errors.push(`sendgrid: ${err}`);
        }
      } else if (BREVO_API_KEY) {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: { name: "Eazy.Family", email: "digest@eazy.family" },
            to: [{ email: recipientEmail, name: firstName }],
            subject,
            htmlContent: html,
          }),
        });
        if (brevoRes.ok) {
          userSent = true;
        } else {
          const err = await brevoRes.text();
          console.error(`Brevo error for ${recipientEmail}:`, err);
          errors.push(`brevo: ${err}`);
        }
      }
    }

    if (userSent) sent++;
  }

  return new Response(JSON.stringify({ sent, errors: errors.length ? errors : undefined }), {
    headers: { "Content-Type": "application/json" },
  });
});

function getZurichOffsetMs(date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const zurichStr = date.toLocaleString("en-US", { timeZone: "Europe/Zurich" });
  return new Date(zurichStr).getTime() - new Date(utcStr).getTime();
}

function formatEventTime(isoStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  return new Date(isoStr).toLocaleTimeString("en-CH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich",
  });
}

type ConflictPair = { titleA: string; titleB: string; startA: string };

function detectConflicts(events: Array<{ title: string; start_date: string; end_date?: string | null }>): ConflictPair[] {
  const normalized = events.map(e => ({
    title: e.title,
    start: new Date(e.start_date),
    end: e.end_date ? new Date(e.end_date) : new Date(new Date(e.start_date).getTime() + 3600000),
  }));

  const found: ConflictPair[] = [];
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i];
      const b = normalized[j];
      if (a.start < b.end && b.start < a.end) {
        found.push({ titleA: a.title, titleB: b.title, startA: events[i].start_date });
        if (found.length >= 2) return found;
      }
    }
  }
  return found;
}

async function generateAINarrative(ctx: {
  apiKey: string;
  firstName: string;
  dayLabel: string;
  todayEvents: Array<{ title: string; start_date: string; all_day: boolean; location?: string | null }>;
  openTasks: Array<{ title: string; due_date?: string | null }>;
  staleTasks: Array<{ title: string; updated_at: string }>;
  conflicts: ConflictPair[];
}): Promise<string> {
  const { apiKey, firstName, dayLabel, todayEvents, openTasks, staleTasks, conflicts } = ctx;

  const context = [
    `Family member: ${firstName}`,
    `Date: ${dayLabel}`,
    `Today's events (${todayEvents.length}): ${todayEvents.map(e => `${e.title} at ${formatEventTime(e.start_date, e.all_day)}${e.location ? ` @ ${e.location}` : ''}`).join(', ') || 'none'}`,
    `Open tasks (${openTasks.length}): ${openTasks.slice(0, 5).map(t => t.title).join(', ') || 'none'}`,
    staleTasks.length > 0 ? `Stale tasks (untouched 7+ days): ${staleTasks.map(t => t.title).join(', ')}` : '',
    conflicts.length > 0 ? `Schedule conflicts: ${conflicts.map(c => `"${c.titleA}" overlaps "${c.titleB}"`).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are a warm, concise family assistant writing a single paragraph (2-3 sentences max) morning message for ${firstName}. Be encouraging, specific to their actual schedule, and flag any conflicts or stale tasks gently. No lists, no headers — just a natural, human paragraph.\n\n${context}`,
        }],
      }),
    });

    if (!res.ok) return "";
    const json = await res.json();
    return json?.content?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

function buildTelegramMessage(ctx: {
  firstName: string;
  dayLabel: string;
  todayEvents: Array<{ title: string; start_date: string; all_day: boolean; location?: string | null }>;
  tasks: Array<{ title: string; due_date?: string | null }>;
  staleTasks: Array<{ title: string; updated_at: string }>;
  conflicts: ConflictPair[];
  aiNarrative: string;
}): string {
  const { firstName, dayLabel, todayEvents, tasks, staleTasks, conflicts, aiNarrative } = ctx;
  const lines: string[] = [];

  lines.push(`☀️ <b>Good morning, ${firstName}!</b>`);
  lines.push(`<i>${dayLabel}</i>`);

  if (aiNarrative) {
    lines.push('');
    lines.push(`<i>${aiNarrative}</i>`);
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push(`⚠️ <b>Schedule Conflict${conflicts.length > 1 ? 's' : ''}</b>`);
    for (const c of conflicts) {
      lines.push(`  · <b>${c.titleA}</b> overlaps <b>${c.titleB}</b>`);
    }
  }

  lines.push('');
  lines.push('📅 <b>Today\'s Schedule</b>');
  if (todayEvents.length === 0) {
    lines.push('  Nothing scheduled — enjoy the breathing room.');
  } else {
    for (const e of todayEvents) {
      const time = formatEventTime(e.start_date, e.all_day);
      const loc = e.location ? ` · 📍 ${e.location}` : '';
      lines.push(`  ${time}  <b>${e.title}</b>${loc}`);
    }
  }

  lines.push('');
  lines.push('✅ <b>Open Tasks</b>');
  if (tasks.length === 0) {
    lines.push("  Nothing open — you're ahead of it.");
  } else {
    for (const t of tasks) {
      lines.push(`  · ${t.title}`);
    }
  }

  if (staleTasks.length > 0) {
    lines.push('');
    lines.push('⏳ <b>Stuck Tasks</b> <i>(untouched 7+ days)</i>');
    for (const t of staleTasks) {
      lines.push(`  · ${t.title}`);
    }
    lines.push('  <i>Worth a delegate or drop?</i>');
  }

  lines.push('');
  lines.push('<a href="https://eazy.family/app">Open Eazy.Family →</a>');

  return lines.join('\n');
}

function buildDigestEmail(ctx: {
  firstName: string;
  dayLabel: string;
  events: Array<{ title: string; start_date: string; all_day: boolean; location?: string | null }>;
  tasks: Array<{ title: string; due_date?: string | null }>;
  staleTasks: Array<{ title: string; updated_at: string }>;
  conflicts: ConflictPair[];
  aiNarrative: string;
}): string {
  const { firstName, dayLabel, events, tasks, staleTasks, conflicts, aiNarrative } = ctx;

  const eventsHtml =
    events.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">Nothing scheduled — enjoy the breathing room.</p>`
      : events.map(e => `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div style="width:52px;flex-shrink:0;text-align:right;color:#964735;font-size:12px;font-weight:600;padding-top:2px;line-height:1.4">
            ${formatEventTime(e.start_date, e.all_day)}
          </div>
          <div style="flex:1;border-left:2px solid #DAC1BB;padding-left:12px">
            <div style="color:#1C1C18;font-size:14px;font-weight:600;line-height:1.4">${e.title}</div>
            ${e.location ? `<div style="color:#7A6660;font-size:12px;margin-top:2px">📍 ${e.location}</div>` : ""}
          </div>
        </div>`).join("");

  const tasksHtml =
    tasks.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">Nothing open — you're ahead of it.</p>`
      : tasks.map(t => `
        <div style="display:flex;align-items:center;margin-bottom:10px">
          <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid #DAC1BB;flex-shrink:0;background:#FAF7F3;margin-right:12px"></div>
          <span style="color:#1C1C18;font-size:14px">${t.title}</span>
        </div>`).join("");

  const conflictsHtml = conflicts.length === 0 ? "" : `
    <div style="background:#FFF8F0;border:1px solid #EDCFB8;border-radius:16px;padding:16px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:14px">⚠️</span>
        <span style="color:#C4621A;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Schedule Conflict${conflicts.length > 1 ? 's' : ''}</span>
      </div>
      ${conflicts.map(c => `
        <div style="margin-bottom:6px">
          <span style="color:#1C1C18;font-size:13px;font-weight:600">${c.titleA}</span>
          <span style="color:#C4621A;font-size:13px"> overlaps </span>
          <span style="color:#1C1C18;font-size:13px;font-weight:600">${c.titleB}</span>
        </div>`).join("")}
    </div>`;

  const staleHtml = staleTasks.length === 0 ? "" : `
    <div style="background:#F9F6F2;border:1px solid #DAC1BB;border-radius:16px;padding:16px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="color:#7A6660;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">⏳ Stuck Tasks</span>
      </div>
      ${staleTasks.map(t => `<div style="color:#7A6660;font-size:13px;margin-bottom:4px">· ${t.title}</div>`).join("")}
      <p style="color:#7A6660;font-size:12px;margin:8px 0 0;font-style:italic">These haven't moved in a week. Worth a delegate or drop?</p>
    </div>`;

  const aiBlock = aiNarrative ? `
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px 24px 20px;margin-bottom:12px">
      <h1 style="color:#1C1C18;font-size:22px;margin:0 0 8px;font-weight:700;line-height:1.2">Good morning, ${firstName} ☀️</h1>
      <p style="color:#7A6660;font-size:14px;line-height:1.7;margin:0">${aiNarrative}</p>
    </div>` : `
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px 24px 20px;margin-bottom:12px">
      <h1 style="color:#1C1C18;font-size:22px;margin:0 0 8px;font-weight:700;line-height:1.2">Good morning, ${firstName} ☀️</h1>
      <p style="color:#7A6660;font-size:14px;line-height:1.6;margin:0">Here's what your family has on today. You're already doing something wonderful — you showed up.</p>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Morning Digest</title>
</head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px">

    <div style="text-align:center;margin-bottom:28px">
      <img src="https://eazy.family/logo.png" alt="Eazy.Family" style="width:44px;height:44px;border-radius:12px">
      <p style="color:#7A6660;font-size:12px;margin:8px 0 0;letter-spacing:0.04em;text-transform:uppercase">Morning Digest · ${dayLabel}</p>
    </div>

    ${aiBlock}
    ${conflictsHtml}
    ${staleHtml}

    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div style="width:8px;height:8px;border-radius:50%;background:#964735;flex-shrink:0;margin-right:10px"></div>
        <span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Today's Schedule</span>
      </div>
      ${eventsHtml}
    </div>

    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="display:flex;align-items:center;margin-bottom:16px">
        <div style="width:8px;height:8px;border-radius:50%;background:#44664F;flex-shrink:0;margin-right:10px"></div>
        <span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Open Tasks</span>
      </div>
      ${tasksHtml}
    </div>

    <div style="background:#EEF4F0;border:1px solid #C8DDD0;border-radius:20px;padding:20px;margin-bottom:24px">
      <p style="color:#44664F;font-size:13px;line-height:1.7;margin:0">
        <strong style="color:#2D4F38">A quiet moment:</strong> The small things — a hug, a shared meal, five minutes without a screen — those are the ones they'll remember. Whatever today holds, you're already giving them that.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:28px">
      <a href="https://eazy.family/app" style="display:inline-block;background:linear-gradient(135deg,#964735,#D97B66);color:#ffffff;font-weight:600;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em">
        Open Eazy.Family →
      </a>
    </div>

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
