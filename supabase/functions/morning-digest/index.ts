import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// ── Language support ──────────────────────────────────────────────────────────
type Lang = 'en' | 'de' | 'fr' | 'it' | 'es' | 'pt';

const LOCALE_MAP: Record<Lang, string> = {
  en: 'en-GB', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
};

const UI: Record<Lang, {
  greeting: string; subline: string; scheduleLabel: string; tasksLabel: string;
  stuckLabel: string; stuckHint: string; noEvents: string; noTasks: string;
  conflicts: string; conflictsPlural: string; overlap: string; quietMoment: string; quietBody: string;
  openApp: string; manageDigest: string; privacy: string; subject: (name: string) => string;
  allDay: string; eventWord: string; eventsWord: string; taskWord: string; tasksWord: string;
}> = {
  en: {
    greeting: 'Good morning',
    subline: 'Morning Digest',
    scheduleLabel: "Today's Schedule",
    tasksLabel: 'Open Tasks',
    stuckLabel: 'Stuck Tasks',
    stuckHint: "These haven't moved in a week. Worth a delegate or drop?",
    noEvents: 'Nothing scheduled — enjoy the breathing room.',
    noTasks: "Nothing open — you're ahead of it.",
    conflicts: 'Schedule Conflict',
    conflictsPlural: 'Schedule Conflicts',
    eventWord: 'event', eventsWord: 'events', taskWord: 'open task', tasksWord: 'open tasks',
    overlap: 'overlaps',
    quietMoment: 'A quiet moment:',
    quietBody: "The small things — a hug, a shared meal, five minutes without a screen — those are the ones they'll remember. Whatever today holds, you're already giving them that.",
    openApp: 'Open Eazy.Family →',
    manageDigest: 'Manage digest',
    privacy: 'Privacy',
    subject: (n) => `Good morning, ${n} ☀️ — Your family's day`,
    allDay: 'All day',
  },
  de: {
    greeting: 'Guten Morgen',
    subline: 'Morgen-Digest',
    scheduleLabel: 'Heutiger Tagesplan',
    tasksLabel: 'Offene Aufgaben',
    stuckLabel: 'Liegengebliebene Aufgaben',
    stuckHint: 'Diese wurden seit einer Woche nicht angerührt. Delegieren oder streichen?',
    noEvents: 'Nichts geplant — genieß die Ruhe.',
    noTasks: 'Nichts offen — du bist bestens vorbereitet.',
    conflicts: 'Terminkonflikt',
    conflictsPlural: 'Terminkonflikte',
    eventWord: 'Termin', eventsWord: 'Termine', taskWord: 'offene Aufgabe', tasksWord: 'offene Aufgaben',
    overlap: 'überschneidet sich mit',
    quietMoment: 'Ein stiller Moment:',
    quietBody: 'Die kleinen Dinge — eine Umarmung, ein gemeinsames Essen, fünf Minuten ohne Bildschirm — das sind die Momente, an die sie sich erinnern werden. Was auch immer heute kommt, du gibst ihnen das bereits.',
    openApp: 'Eazy.Family öffnen →',
    manageDigest: 'Digest verwalten',
    privacy: 'Datenschutz',
    subject: (n) => `Guten Morgen, ${n} ☀️ — Der Familientag`,
    allDay: 'Ganztägig',
  },
  fr: {
    greeting: 'Bonjour',
    subline: 'Digest du matin',
    scheduleLabel: "Programme d'aujourd'hui",
    tasksLabel: 'Tâches ouvertes',
    stuckLabel: 'Tâches bloquées',
    stuckHint: "Ces tâches n'ont pas bougé depuis une semaine. À déléguer ou abandonner ?",
    noEvents: 'Rien de prévu — profite de cette liberté.',
    noTasks: "Rien en cours — tu as de l'avance.",
    conflicts: 'Conflit de planning',
    conflictsPlural: 'Conflits de planning',
    eventWord: 'événement', eventsWord: 'événements', taskWord: 'tâche ouverte', tasksWord: 'tâches ouvertes',
    overlap: 'chevauche',
    quietMoment: 'Un moment de calme :',
    quietBody: "Les petites choses — un câlin, un repas partagé, cinq minutes sans écran — ce sont celles dont ils se souviendront. Quoi que la journée apporte, tu leur donnes déjà ça.",
    openApp: 'Ouvrir Eazy.Family →',
    manageDigest: 'Gérer le digest',
    privacy: 'Confidentialité',
    subject: (n) => `Bonjour, ${n} ☀️ — La journée de ta famille`,
    allDay: 'Toute la journée',
  },
  it: {
    greeting: 'Buongiorno',
    subline: 'Digest mattutino',
    scheduleLabel: 'Programma di oggi',
    tasksLabel: 'Attività aperte',
    stuckLabel: 'Attività bloccate',
    stuckHint: "Queste non sono state toccate da una settimana. Vale la pena delegarle o eliminarle?",
    noEvents: 'Niente in programma — goditi lo spazio.',
    noTasks: "Niente in sospeso — sei avanti.",
    conflicts: 'Conflitto di orario',
    conflictsPlural: 'Conflitti di orario',
    eventWord: 'evento', eventsWord: 'eventi', taskWord: 'attività aperta', tasksWord: 'attività aperte',
    overlap: 'si sovrappone a',
    quietMoment: 'Un momento di quiete:',
    quietBody: "Le piccole cose — un abbraccio, un pasto condiviso, cinque minuti senza schermo — sono quelle che ricorderanno. Qualunque cosa accada oggi, stai già dando loro questo.",
    openApp: 'Apri Eazy.Family →',
    manageDigest: 'Gestisci il digest',
    privacy: 'Privacy',
    subject: (n) => `Buongiorno, ${n} ☀️ — La giornata della tua famiglia`,
    allDay: 'Tutto il giorno',
  },
  es: {
    greeting: 'Buenos días',
    subline: 'Resumen matutino',
    scheduleLabel: 'Agenda de hoy',
    tasksLabel: 'Tareas abiertas',
    stuckLabel: 'Tareas atascadas',
    stuckHint: 'Estas no se han movido en una semana. ¿Vale la pena delegarlas o eliminarlas?',
    noEvents: 'Nada programado — disfruta del espacio.',
    noTasks: 'Nada pendiente — vas por delante.',
    conflicts: 'Conflicto de horario',
    conflictsPlural: 'Conflictos de horario',
    eventWord: 'evento', eventsWord: 'eventos', taskWord: 'tarea abierta', tasksWord: 'tareas abiertas',
    overlap: 'se superpone con',
    quietMoment: 'Un momento tranquilo:',
    quietBody: "Las pequeñas cosas — un abrazo, una comida compartida, cinco minutos sin pantalla — son las que recordarán. Pase lo que pase hoy, ya les estás dando eso.",
    openApp: 'Abrir Eazy.Family →',
    manageDigest: 'Gestionar resumen',
    privacy: 'Privacidad',
    subject: (n) => `Buenos días, ${n} ☀️ — El día de tu familia`,
    allDay: 'Todo el día',
  },
  pt: {
    greeting: 'Bom dia',
    subline: 'Digest matinal',
    scheduleLabel: 'Programa de hoje',
    tasksLabel: 'Tarefas abertas',
    stuckLabel: 'Tarefas paradas',
    stuckHint: 'Estas não foram tocadas há uma semana. Vale a pena delegar ou eliminar?',
    noEvents: 'Nada agendado — aproveita o espaço.',
    noTasks: 'Nada em aberto — estás adiantado.',
    conflicts: 'Conflito de horário',
    conflictsPlural: 'Conflitos de horário',
    eventWord: 'evento', eventsWord: 'eventos', taskWord: 'tarefa aberta', tasksWord: 'tarefas abertas',
    overlap: 'sobrepõe-se a',
    quietMoment: 'Um momento tranquilo:',
    quietBody: "As pequenas coisas — um abraço, uma refeição partilhada, cinco minutos sem ecrã — são as que vão lembrar. Independentemente do que hoje traga, já lhes estás a dar isso.",
    openApp: 'Abrir Eazy.Family →',
    manageDigest: 'Gerir digest',
    privacy: 'Privacidade',
    subject: (n) => `Bom dia, ${n} ☀️ — O dia da tua família`,
    allDay: 'Dia inteiro',
  },
};

function getLang(raw: unknown): Lang {
  const s = String(raw ?? '').split('-')[0].toLowerCase();
  return (['en','de','fr','it','es','pt'] as Lang[]).includes(s as Lang) ? (s as Lang) : 'en';
}

// ── "A quiet moment" pool ─────────────────────────────────────────────────────
// Rotated by day-of-year so the closing thought varies daily instead of
// repeating the same paragraph in every email. ui.quietBody stays as entry 0.
const QUIET_MOMENTS: Record<Lang, string[]> = {
  en: [
    "The small things — a hug, a shared meal, five minutes without a screen — those are the ones they'll remember. Whatever today holds, you're already giving them that.",
    "Nobody remembers a perfectly managed day. They remember that you laughed together at breakfast. Aim for that.",
    "You don't need more hours — just a few minutes where nothing else is allowed in. Find five of them today.",
    "Kids don't wait for the big moments. They're watching the small ones: how you say hello, how you say goodnight.",
    "A calm parent is worth more than a finished to-do list. If something has to slip today, let it be the right thing.",
    "Being there beats being perfect. Today, presence is the plan.",
    "The days feel long and the years short. One real conversation today is enough to make it count.",
    "Let one thing stay unfinished today — and spend that time simply being with them.",
  ],
  de: [
    "Die kleinen Dinge — eine Umarmung, ein gemeinsames Essen, fünf Minuten ohne Bildschirm — das sind die Momente, an die sie sich erinnern werden. Was auch immer heute kommt, du gibst ihnen das bereits.",
    "Niemand erinnert sich an einen perfekt organisierten Tag. Aber daran, dass ihr beim Frühstück zusammen gelacht habt. Darauf kommt es an.",
    "Du brauchst nicht mehr Stunden — nur ein paar Minuten, in denen nichts anderes Platz hat. Finde heute fünf davon.",
    "Kinder warten nicht auf die großen Momente. Sie sehen die kleinen: wie du Hallo sagst, wie du Gute Nacht sagst.",
    "Ein gelassenes Elternteil ist mehr wert als eine abgehakte Liste. Wenn heute etwas liegen bleibt, dann das Richtige.",
    "Da sein schlägt perfekt sein. Heute ist Präsenz der Plan.",
    "Die Tage fühlen sich lang an, die Jahre kurz. Ein echtes Gespräch heute reicht, damit der Tag zählt.",
    "Lass heute eine Sache unerledigt — und verbringe die Zeit einfach mit ihnen.",
  ],
  fr: [
    "Les petites choses — un câlin, un repas partagé, cinq minutes sans écran — ce sont celles dont ils se souviendront. Quoi que la journée apporte, tu leur donnes déjà ça.",
    "Personne ne se souvient d'une journée parfaitement organisée. Mais d'avoir ri ensemble au petit-déjeuner, oui. Vise ça.",
    "Tu n'as pas besoin de plus d'heures — juste de quelques minutes où rien d'autre n'a le droit d'entrer. Trouves-en cinq aujourd'hui.",
    "Les enfants n'attendent pas les grands moments. Ils regardent les petits : comment tu dis bonjour, comment tu dis bonne nuit.",
    "Un parent serein vaut plus qu'une liste terminée. Si quelque chose doit attendre aujourd'hui, que ce soit la bonne chose.",
    "Être là vaut mieux qu'être parfait. Aujourd'hui, la présence est le plan.",
    "Les journées semblent longues, les années courtes. Une vraie conversation aujourd'hui suffit à donner du sens à la journée.",
    "Laisse une chose inachevée aujourd'hui — et passe ce temps simplement avec eux.",
  ],
  it: [
    "Le piccole cose — un abbraccio, un pasto condiviso, cinque minuti senza schermo — sono quelle che ricorderanno. Qualunque cosa accada oggi, stai già dando loro questo.",
    "Nessuno ricorda una giornata perfettamente organizzata. Ricordano che avete riso insieme a colazione. Punta a quello.",
    "Non ti servono più ore — solo qualche minuto in cui nient'altro può entrare. Trovane cinque oggi.",
    "I bambini non aspettano i grandi momenti. Guardano i piccoli: come dici ciao, come dici buonanotte.",
    "Un genitore sereno vale più di una lista completata. Se oggi qualcosa deve saltare, che sia la cosa giusta.",
    "Esserci batte essere perfetti. Oggi il piano è la presenza.",
    "Le giornate sembrano lunghe, gli anni brevi. Una conversazione vera oggi basta a dare valore alla giornata.",
    "Lascia una cosa in sospeso oggi — e usa quel tempo semplicemente per stare con loro.",
  ],
  es: [
    "Las pequeñas cosas — un abrazo, una comida compartida, cinco minutos sin pantalla — son las que recordarán. Pase lo que pase hoy, ya les estás dando eso.",
    "Nadie recuerda un día perfectamente organizado. Recuerdan que os reísteis juntos en el desayuno. Apunta a eso.",
    "No necesitas más horas — solo unos minutos donde no entre nada más. Encuentra cinco hoy.",
    "Los niños no esperan los grandes momentos. Miran los pequeños: cómo saludas, cómo das las buenas noches.",
    "Un padre tranquilo vale más que una lista terminada. Si algo tiene que quedar sin hacer hoy, que sea lo correcto.",
    "Estar presente vale más que ser perfecto. Hoy, el plan es la presencia.",
    "Los días se hacen largos y los años cortos. Una conversación de verdad hoy basta para que el día cuente.",
    "Deja una cosa sin terminar hoy — y usa ese tiempo simplemente para estar con ellos.",
  ],
  pt: [
    "As pequenas coisas — um abraço, uma refeição partilhada, cinco minutos sem ecrã — são as que vão lembrar. Independentemente do que hoje traga, já lhes estás a dar isso.",
    "Ninguém se lembra de um dia perfeitamente organizado. Lembram-se de terem rido juntos ao pequeno-almoço. Aponta para isso.",
    "Não precisas de mais horas — só de alguns minutos onde mais nada pode entrar. Encontra cinco hoje.",
    "As crianças não esperam pelos grandes momentos. Reparam nos pequenos: como dizes olá, como dizes boa noite.",
    "Um pai tranquilo vale mais do que uma lista concluída. Se algo tiver de ficar por fazer hoje, que seja a coisa certa.",
    "Estar presente vale mais do que ser perfeito. Hoje, o plano é a presença.",
    "Os dias parecem longos e os anos curtos. Uma conversa a sério hoje chega para o dia valer a pena.",
    "Deixa uma coisa por acabar hoje — e usa esse tempo simplesmente para estar com eles.",
  ],
};

function pickQuietMoment(lang: Lang, date: Date): string {
  const pool = QUIET_MOMENTS[lang] ?? QUIET_MOMENTS.en;
  const dayOfYear = Math.floor(
    (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000
  );
  return pool[dayOfYear % pool.length];
}

// ── Per-user timezone ─────────────────────────────────────────────────────────
// The app syncs the device timezone into user_preferences as `eazy-timezone`.
// Fall back to Europe/Zurich (the original hardcoded behaviour) when absent.
function getUserTimezone(data: Record<string, unknown> | null | undefined): string {
  const tz = String(data?.["eazy-timezone"] ?? "").trim();
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    } catch { /* invalid tz string — fall through */ }
  }
  return "Europe/Zurich";
}

// ── User calendar from the prefs blob ─────────────────────────────────────────
// The user's REAL calendar lives in localStorage `eazy-family-calendar-items`,
// cloud-synced into user_preferences. The Supabase `events` table is the
// separate community-events feature and is NEVER written by the Calendar page —
// reading it meant every digest said "Nothing scheduled" and conflict warnings
// never fired.
type CalItem = {
  title: string;
  start_date: string;
  end_date?: string | null;
  all_day: boolean;
  location?: string | null;
  type?: string;
};

function parseCalendarItems(data: Record<string, unknown> | null | undefined): CalItem[] {
  try {
    const raw = data?.["eazy-family-calendar-items"];
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((i: Record<string, unknown>) => i && typeof i.title === "string" && typeof i.startDate === "string")
      .map((i: Record<string, unknown>) => ({
        title: i.title as string,
        start_date: i.startDate as string,
        end_date: (i.endDate as string) ?? null,
        all_day: i.allDay === true,
        location: (i.location as string) ?? null,
        type: (i.type as string) ?? "event",
      }));
  } catch {
    return [];
  }
}

// ── Batch config ──────────────────────────────────────────────────────────────
// Each invocation processes one batch then self-invokes for the next.
// 75 users × ~3s each (DB + Anthropic + email) ≈ 225s, well within 400s limit.
const BATCH_SIZE = 75;

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  // A missing CRON_SECRET must fail closed — the old `if (cronSecret && …)`
  // guard left the endpoint publicly triggerable when the env var was unset.
  if (!cronSecret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // offset is 0 on the first (cron) call, incremented by self-invocation.
  // test_user_id (authed callers only) processes a single user — for safely
  // verifying the digest without mailing every opted-in user.
  let offset = 0;
  let testUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    offset = Number(body?.offset ?? 0) || 0;
    testUserId = typeof body?.test_user_id === "string" ? body.test_user_id : null;
  } catch { /* first call has no body */ }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
  // TELEGRAM_ADMIN_USER_ID gates Telegram delivery to the account owner only.
  // Without this, every opted-in user's private data is sent to the same chat.
  const TELEGRAM_ADMIN_USER_ID = Deno.env.get("TELEGRAM_ADMIN_USER_ID");

  const now = new Date();

  const { data: prefRows, error: prefErr } = await supabase
    .from("user_preferences")
    .select("user_id, data");

  if (prefErr) {
    return new Response(JSON.stringify({ error: prefErr.message }), { status: 500 });
  }

  const isTruthy = (v: unknown) => v === true || v === "true";

  let allDigestUsers = (prefRows ?? []).filter(
    (row) => isTruthy(row.data?.["eazy-morning-digest"])
  );
  if (testUserId) {
    allDigestUsers = allDigestUsers.filter((row) => row.user_id === testUserId);
  }

  if (allDigestUsers.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no opt-ins" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Slice this batch
  const digestUsers = allDigestUsers.slice(offset, offset + BATCH_SIZE);
  const hasMore = offset + BATCH_SIZE < allDigestUsers.length;

  // Fire next batch before processing so the cron response isn't blocked
  if (hasMore) {
    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/morning-digest`;
    fetch(functionUrl, {
      method: "POST",
      headers: { "Authorization": authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ offset: offset + BATCH_SIZE }),
    }).catch(() => { /* best-effort */ });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const { user_id, data } of digestUsers) {
    const lang = getLang(data?.["eazy-family-language"]);
    const ui = UI[lang];
    const locale = LOCALE_MAP[lang];

    // Per-user timezone: "today" starts when it starts for THIS user, not in Zurich.
    const tz = getUserTimezone(data);
    const tzOffset = getTzOffsetMs(now, tz);
    const tzNow = new Date(now.getTime() + tzOffset);
    const todayStartLocal = new Date(Date.UTC(
      tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate()
    ));
    const todayStartUTC = new Date(todayStartLocal.getTime() - tzOffset);
    const todayEndUTC = new Date(todayStartUTC.getTime() + 86400000);
    const weekAheadUTC = new Date(todayStartUTC.getTime() + 7 * 86400000);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile) continue;

    let recipientEmail = profile.email;
    if (!recipientEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
      recipientEmail = authUser?.user?.email ?? null;
    }
    if (!recipientEmail) continue;

    const SENDER_EMAIL = "hello@eazy.family";

    // Calendar comes from the synced prefs blob (the app's real calendar store)
    const calendarItems = parseCalendarItems(data);
    const todayEvents = calendarItems
      .filter(e => {
        const start = new Date(e.start_date);
        return start >= todayStartUTC && start < todayEndUTC;
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    // Conflicts: timed, non-reminder items over the next 7 days (incl. today)
    const conflictWindow = calendarItems.filter(e => {
      if (e.all_day || e.type === "reminder") return false;
      const start = new Date(e.start_date);
      return start >= todayStartUTC && start < weekAheadUTC;
    });
    const conflicts = detectConflicts(conflictWindow);

    const [ownTasksRes, assignedTasksRes, staleTasksRes] = await Promise.all([
      // Own open tasks — excluding shopping AND shared list CONTAINERS
      // (type='shared' with no parent_id is a list header like "Family To-Dos 🏡",
      // not a task; it showed up as an eternal open task).
      supabase
        .from("tasks")
        .select("id, title, due_date, updated_at")
        .eq("user_id", user_id)
        .eq("completed", false)
        .not("type", "ilike", "shopping%")
        .or("type.neq.shared,parent_id.not.is.null")
        .order("due_date", { ascending: true })
        .limit(8),
      // Tasks ASSIGNED to this user by other family members — the most
      // digest-worthy tasks of all, previously invisible (creator-only filter).
      supabase
        .from("tasks")
        .select("id, title, due_date, updated_at")
        .eq("completed", false)
        .contains("assigned_to_users", [user_id])
        .neq("user_id", user_id)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("tasks")
        .select("title, updated_at")
        .eq("user_id", user_id)
        .eq("completed", false)
        .eq("type", "task")
        .lte("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
        .order("updated_at")
        .limit(3),
    ]);

    const seenTaskIds = new Set<string>();
    const openTasks = [...(assignedTasksRes.data ?? []), ...(ownTasksRes.data ?? [])]
      .filter(t => {
        if (seenTaskIds.has(t.id)) return false;
        seenTaskIds.add(t.id);
        return true;
      })
      .slice(0, 8);
    const staleTasks = staleTasksRes.data ?? [];

    const firstName = profile.full_name?.split(" ")[0] || "there";
    const dayLabel = now.toLocaleDateString(locale, {
      weekday: "long", month: "long", day: "numeric", timeZone: tz,
    });
    const quiet = pickQuietMoment(lang, tzNow);

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
        lang,
        locale,
        tz,
      });
    }

    // Subject varies with the day's content instead of repeating the same line
    const subjectParts: string[] = [];
    if (todayEvents.length) subjectParts.push(`${todayEvents.length} ${todayEvents.length === 1 ? ui.eventWord : ui.eventsWord}`);
    if (openTasks.length) subjectParts.push(`${openTasks.length} ${openTasks.length === 1 ? ui.taskWord : ui.tasksWord}`);
    const subject = subjectParts.length
      ? `${ui.greeting}, ${firstName} ☀️ — ${subjectParts.join(" · ")}`
      : ui.subject(firstName);

    let userSent = false;

    // ── Telegram ──────────────────────────────────────────────────────────
    // Only deliver to Telegram for the admin/owner user. TELEGRAM_CHAT_ID is a
    // single environment variable — sending it for every user would expose each
    // user's private schedule and tasks to the owner's chat (cross-account leak).
    // SAFE DEFAULT: if TELEGRAM_ADMIN_USER_ID is NOT configured, deliver to NO
    // ONE via Telegram. The previous `!TELEGRAM_ADMIN_USER_ID || …` sent EVERY
    // user's digest to the owner's chat whenever the env var was unset.
    const isAdminUser = !!TELEGRAM_ADMIN_USER_ID && user_id === TELEGRAM_ADMIN_USER_ID;
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && isAdminUser) {
      const msg = buildTelegramMessage({ firstName, dayLabel, todayEvents, tasks: openTasks.slice(0, 6), staleTasks, conflicts, aiNarrative, ui, locale, tz });
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
      const html = buildDigestEmail({ firstName, dayLabel, events: todayEvents, tasks: openTasks.slice(0, 6), staleTasks, conflicts, aiNarrative, quiet, ui, locale, tz, lang });

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
            headers: {
              "List-Unsubscribe": "<https://eazy.family/app/settings>",
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
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
            headers: { "List-Unsubscribe": "<https://eazy.family/app/settings>" },
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

  return new Response(JSON.stringify({
    sent,
    batch: { offset, size: digestUsers.length, hasMore },
    errors: errors.length ? errors : undefined,
  }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ── Utilities ─────────────────────────────────────────────────────────────────
function getTzOffsetMs(date: Date, tz: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}

function formatEventTime(isoStr: string, allDay: boolean, locale: string, allDayLabel: string, tz: string): string {
  if (allDay) return allDayLabel;
  return new Date(isoStr).toLocaleTimeString(locale, {
    hour: "2-digit", minute: "2-digit", timeZone: tz,
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
  lang: Lang;
  locale: string;
  tz: string;
}): Promise<string> {
  const { apiKey, firstName, dayLabel, todayEvents, openTasks, staleTasks, conflicts, lang, locale, tz } = ctx;

  const context = [
    `Family member: ${firstName}`,
    `Date: ${dayLabel}`,
    `Today's events (${todayEvents.length}): ${todayEvents.map(e => `${e.title} at ${formatEventTime(e.start_date, e.all_day, locale, 'all day', tz)}${e.location ? ` @ ${e.location}` : ''}`).join(', ') || 'none'}`,
    `Open tasks (${openTasks.length}): ${openTasks.slice(0, 5).map(t => t.title).join(', ') || 'none'}`,
    staleTasks.length > 0 ? `Stale tasks (untouched 7+ days): ${staleTasks.map(t => t.title).join(', ')}` : '',
    conflicts.length > 0 ? `Schedule conflicts: ${conflicts.map(c => `"${c.titleA}" overlaps "${c.titleB}"`).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const langNames: Record<Lang, string> = {
    en: 'English', de: 'German', fr: 'French', it: 'Italian', es: 'Spanish', pt: 'Portuguese',
  };

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
          content: `You are a warm, concise family assistant writing a single paragraph (2-3 sentences max) morning message for ${firstName}. Be encouraging, specific to their actual schedule, and flag any conflicts or stale tasks gently. No lists, no headers — just a natural, human paragraph. Write entirely in ${langNames[lang]}.\n\n${context}`,
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

// ── Telegram builder ──────────────────────────────────────────────────────────
function buildTelegramMessage(ctx: {
  firstName: string;
  dayLabel: string;
  todayEvents: Array<{ title: string; start_date: string; all_day: boolean; location?: string | null }>;
  tasks: Array<{ title: string; due_date?: string | null }>;
  staleTasks: Array<{ title: string; updated_at: string }>;
  conflicts: ConflictPair[];
  aiNarrative: string;
  ui: typeof UI[Lang];
  locale: string;
  tz: string;
}): string {
  const { firstName, dayLabel, todayEvents, tasks, staleTasks, conflicts, aiNarrative, ui, locale, tz } = ctx;
  const lines: string[] = [];

  lines.push(`☀️ <b>${ui.greeting}, ${firstName}!</b>`);
  lines.push(`<i>${dayLabel}</i>`);

  if (aiNarrative) {
    lines.push('');
    lines.push(`<i>${aiNarrative}</i>`);
  }

  if (conflicts.length > 0) {
    lines.push('');
    lines.push(`⚠️ <b>${conflicts.length > 1 ? ui.conflictsPlural : ui.conflicts}</b>`);
    for (const c of conflicts) {
      lines.push(`  · <b>${c.titleA}</b> ${ui.overlap} <b>${c.titleB}</b>`);
    }
  }

  lines.push('');
  lines.push(`📅 <b>${ui.scheduleLabel}</b>`);
  if (todayEvents.length === 0) {
    lines.push(`  ${ui.noEvents}`);
  } else {
    for (const e of todayEvents) {
      const time = formatEventTime(e.start_date, e.all_day, locale, ui.allDay, tz);
      const loc = e.location ? ` · 📍 ${e.location}` : '';
      lines.push(`  ${time}  <b>${e.title}</b>${loc}`);
    }
  }

  lines.push('');
  lines.push(`✅ <b>${ui.tasksLabel}</b>`);
  if (tasks.length === 0) {
    lines.push(`  ${ui.noTasks}`);
  } else {
    for (const t of tasks) {
      lines.push(`  · ${t.title}`);
    }
  }

  if (staleTasks.length > 0) {
    lines.push('');
    lines.push(`⏳ <b>${ui.stuckLabel}</b>`);
    for (const t of staleTasks) {
      lines.push(`  · ${t.title}`);
    }
    lines.push(`  <i>${ui.stuckHint}</i>`);
  }

  lines.push('');
  lines.push(`<a href="https://eazy.family/app">${ui.openApp}</a>`);

  return lines.join('\n');
}

// ── Email builder ─────────────────────────────────────────────────────────────
function buildDigestEmail(ctx: {
  firstName: string;
  dayLabel: string;
  events: Array<{ title: string; start_date: string; all_day: boolean; location?: string | null }>;
  tasks: Array<{ title: string; due_date?: string | null }>;
  staleTasks: Array<{ title: string; updated_at: string }>;
  conflicts: ConflictPair[];
  aiNarrative: string;
  quiet: string;
  ui: typeof UI[Lang];
  locale: string;
  tz: string;
  lang: Lang;
}): string {
  const { firstName, dayLabel, events, tasks, staleTasks, conflicts, aiNarrative, quiet, ui, locale, tz, lang } = ctx;

  // Table-based rows — display:flex is unsupported in Outlook desktop.
  const eventsHtml =
    events.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">${ui.noEvents}</p>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${events.map(e => `
        <tr>
          <td width="56" valign="top" align="right" style="color:#964735;font-size:12px;font-weight:600;padding:0 0 12px;line-height:1.4;white-space:nowrap">
            ${formatEventTime(e.start_date, e.all_day, locale, ui.allDay, tz)}
          </td>
          <td valign="top" style="border-left:2px solid #DAC1BB;padding:0 0 12px 12px">
            <div style="color:#1C1C18;font-size:14px;font-weight:600;line-height:1.4">${e.title}</div>
            ${e.location ? `<div style="color:#7A6660;font-size:12px;margin-top:2px">📍 ${e.location}</div>` : ""}
          </td>
        </tr>`).join("")}</table>`;

  const tasksHtml =
    tasks.length === 0
      ? `<p style="color:#7A6660;font-size:14px;margin:0;font-style:italic">${ui.noTasks}</p>`
      : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tasks.map(t => `
        <tr>
          <td width="28" valign="top" style="padding:0 0 10px;color:#DAC1BB;font-size:14px;line-height:1.5">◯</td>
          <td valign="top" style="padding:0 0 10px;color:#1C1C18;font-size:14px;line-height:1.5">${t.title}</td>
        </tr>`).join("")}</table>`;

  const conflictsHtml = conflicts.length === 0 ? "" : `
    <div style="background:#FFF8F0;border:1px solid #EDCFB8;border-radius:16px;padding:16px 20px;margin-bottom:12px">
      <div style="margin-bottom:10px">
        <span style="font-size:14px">⚠️</span>
        <span style="color:#C4621A;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">&nbsp;${conflicts.length > 1 ? ui.conflictsPlural : ui.conflicts}</span>
      </div>
      ${conflicts.map(c => `
        <div style="margin-bottom:6px">
          <span style="color:#1C1C18;font-size:13px;font-weight:600">${c.titleA}</span>
          <span style="color:#C4621A;font-size:13px"> ${ui.overlap} </span>
          <span style="color:#1C1C18;font-size:13px;font-weight:600">${c.titleB}</span>
        </div>`).join("")}
    </div>`;

  const staleHtml = staleTasks.length === 0 ? "" : `
    <div style="background:#F9F6F2;border:1px solid #DAC1BB;border-radius:16px;padding:16px 20px;margin-bottom:12px">
      <div style="margin-bottom:10px">
        <span style="color:#7A6660;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">⏳ ${ui.stuckLabel}</span>
      </div>
      ${staleTasks.map(t => `<div style="color:#7A6660;font-size:13px;margin-bottom:4px">· ${t.title}</div>`).join("")}
      <p style="color:#7A6660;font-size:12px;margin:8px 0 0;font-style:italic">${ui.stuckHint}</p>
    </div>`;

  const aiBlock = aiNarrative ? `
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px 24px 20px;margin-bottom:12px">
      <h1 style="color:#1C1C18;font-size:22px;margin:0 0 8px;font-weight:700;line-height:1.2">${ui.greeting}, ${firstName} ☀️</h1>
      <p style="color:#7A6660;font-size:14px;line-height:1.7;margin:0">${aiNarrative}</p>
    </div>` : `
    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px 24px 20px;margin-bottom:12px">
      <h1 style="color:#1C1C18;font-size:22px;margin:0 0 8px;font-weight:700;line-height:1.2">${ui.greeting}, ${firstName} ☀️</h1>
    </div>`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${ui.subline}</title>
</head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px 48px">

    <div style="text-align:center;margin-bottom:28px">
      <img src="https://eazy.family/logo.png" alt="Eazy.Family" style="width:44px;height:44px;border-radius:12px">
      <p style="color:#7A6660;font-size:12px;margin:8px 0 0;letter-spacing:0.04em;text-transform:uppercase">${ui.subline} · ${dayLabel}</p>
    </div>

    ${aiBlock}
    ${conflictsHtml}
    ${staleHtml}

    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="margin-bottom:16px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#964735;margin-right:10px"></span><span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${ui.scheduleLabel}</span>
      </div>
      ${eventsHtml}
    </div>

    <div style="background:#FFFFFF;border:1px solid #DAC1BB;border-radius:20px;padding:24px;margin-bottom:12px">
      <div style="margin-bottom:16px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#44664F;margin-right:10px"></span><span style="color:#1C1C18;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">${ui.tasksLabel}</span>
      </div>
      ${tasksHtml}
    </div>

    <div style="background:#EEF4F0;border:1px solid #C8DDD0;border-radius:20px;padding:20px;margin-bottom:24px">
      <p style="color:#44664F;font-size:13px;line-height:1.7;margin:0">
        <strong style="color:#2D4F38">${ui.quietMoment}</strong> ${quiet}
      </p>
    </div>

    <div style="text-align:center;margin-bottom:28px">
      <a href="https://eazy.family/app" style="display:inline-block;background:linear-gradient(135deg,#964735,#D97B66);color:#ffffff;font-weight:600;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em">
        ${ui.openApp}
      </a>
    </div>

    <p style="color:#DAC1BB;font-size:11px;text-align:center;margin:0;line-height:1.6">
      © ${new Date().getFullYear()} Eazy.Family &nbsp;·&nbsp;
      <a href="https://eazy.family/app/settings" style="color:#DAC1BB;text-decoration:none">${ui.manageDigest}</a>
      &nbsp;·&nbsp;
      <a href="https://eazy.family/privacy" style="color:#DAC1BB;text-decoration:none">${ui.privacy}</a>
    </p>

  </div>
</body>
</html>`;
}
