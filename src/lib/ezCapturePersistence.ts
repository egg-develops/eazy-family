import type { CaptureType } from '@/lib/intentClassifier';
import { getAppBaseLanguage } from '@/lib/speechLocale';

export interface EZParsedEntry {
  type: CaptureType;
  title: string;
  date: string | null;
  time: string | null;
  endTime: string | null;
  location: string | null;
  assignees: string[] | null;
  reminder: string | null;
  notes: string | null;
  mood: string | null;
}

export interface TaskCaptureRow {
  title: string;
  type: 'task' | 'shared' | 'shopping' | 'shopping_personal';
  user_id: string;
  completed: false;
  due_date?: string | null;
  assigned_to_users?: string[] | null;
  family_id?: string | null;
  visible_to?: string | null;
  parent_id?: string | null;
}

export interface FamilyMemberLite {
  user_id: string;
  name: string; // full or display name
}

/** First word, lowercased — for first-name matching. */
const firstName = (n: string): string => n.trim().toLowerCase().split(/\s+/)[0] || '';

/** Levenshtein distance — used for fuzzy name matching (e.g. "Sophia" ↔ "Sofia"). */
function editDist(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

/**
 * Resolve parsed assignee names (first names from the voice query) to family
 * member user ids. Exact first-name match first; falls back to edit-distance ≤ 1
 * for names ≥ 4 chars so "Sophia" resolves to "Sofia", "Leo" to "Léo", etc.
 * "me"/"myself"/"I" and the user's own first name resolve to self.
 * Unmatched names are dropped. Deduplicated, order-preserving.
 */
export function resolveAssignees(
  names: string[] | null | undefined,
  members: FamilyMemberLite[],
  self: { userId: string; name: string },
): string[] {
  if (!names || names.length === 0) return [];
  const selfFirst = firstName(self.name);
  const out: string[] = [];
  const add = (id: string) => { if (id && !out.includes(id)) out.push(id); };
  for (const raw of names) {
    const fn = firstName(raw);
    if (!fn) continue;
    if (fn === 'me' || fn === 'myself' || fn === 'i' || (selfFirst && fn === selfFirst)) {
      add(self.userId);
      continue;
    }
    const exact = members.find(m => firstName(m.name) === fn);
    if (exact) { add(exact.user_id); continue; }
    // Fuzzy fallback: handles voice pronunciation variants.
    // Threshold scales with name length:
    //   ≥ 5 chars both sides → allow 2 edits ("Sophia" ↔ "Sofia")
    //   ≥ 3 chars both sides → allow 1 edit  ("Leo" ↔ "Léo")
    if (fn.length >= 3) {
      const fuzzy = members.find(m => {
        const mfn = firstName(m.name);
        if (mfn.length < 3) return false;
        const threshold = fn.length >= 5 && mfn.length >= 5 ? 2 : 1;
        return editDist(mfn, fn) <= threshold;
      });
      if (fuzzy) add(fuzzy.user_id);
    }
  }
  return out;
}

export interface TaskCaptureOptions {
  assignedUserIds?: string[];
  familyId?: string | null;
  /** When set, the task is created as an ITEM inside this shared list. */
  parentId?: string | null;
  /** Base app language ("de", "fr", …) — defaults to the stored app language. */
  lang?: string;
  /** Input explicitly named a shared/family destination ("our to-do list") even
   *  without a named assignee — routes the task to the family shared list. */
  isExplicitlyShared?: boolean;
}

const AND_BY_LANG: Record<string, string> = {
  en: 'and', de: 'und', fr: 'et', it: 'e', es: 'y', pt: 'e',
};

/** Separator for multi-item titles: commas/semicolons/newlines + the language's "and". */
function itemSplitRegex(lang?: string): RegExp {
  const and = AND_BY_LANG[lang ?? getAppBaseLanguage()] ?? 'and';
  return new RegExp(`[,;\\n]|\\b${and}\\b`, 'i');
}

export function isFeatureHelpQuery(input: string): boolean {
  const s = input.trim().toLowerCase();
  const en = /^(how|what|where|why|when|can i|can you|do i|does|is there|which|tell me|explain|help|show me|what's|what is|how do|how can|how to)\b/;
  const de = /^(wie|was|wo|warum|wann|kann ich|kannst du|gibt es|welche[rns]?|erkl[äa]r|hilf mir|zeig mir)\b/;
  const fr = /^(comment|quoi|où|pourquoi|quand|puis-je|peux-tu|est-ce que|quelle?s?|expliqu|aidez|montre)/;
  const it = /^(come|cosa|dove|perch[eé]|quando|posso|puoi|c'è|qual[ei]|spiega|aiutami)/;
  const es = /^(c[oó]mo|qu[eé]|d[oó]nde|por qu[eé]|cu[aá]ndo|puedo|puedes|hay|cu[aá]l|explica|ay[uú]dame)/;
  const pt = /^(como|o que|onde|por que|quando|posso|podes|h[aá]|qual|explica|ajuda)/;
  return en.test(s) || de.test(s) || fr.test(s) || it.test(s) || es.test(s) || pt.test(s)
    || (s.includes('?') && s.length > 8);
}

export function buildTaskCaptureRows(
  entry: EZParsedEntry,
  userId: string,
  options: TaskCaptureOptions = {},
): TaskCaptureRow[] {
  const dueDate = entry.date
    ? new Date(`${entry.date}T${entry.time ?? '00:00:00'}`).toISOString()
    : null;

  const assignees = options.assignedUserIds ?? [];
  // Shared when: assigned to another family member (always), OR the user
  // explicitly named a shared/family destination in the input ("our to-do list").
  // Personal tasks ('task') are only visible to their creator under RLS, so any
  // of these conditions requires type='shared' + family_id + parent_id.
  const hasOthers = assignees.some(id => id !== userId);
  const isShared = (hasOthers || !!options.isExplicitlyShared) && !!options.familyId && !!options.parentId;

  return entry.title
    .split(/[,;\n]/)
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => ({
      title,
      type: isShared ? 'shared' as const : 'task' as const,
      user_id: userId,
      completed: false,
      due_date: dueDate,
      ...(assignees.length ? { assigned_to_users: assignees } : {}),
      ...(isShared ? { family_id: options.familyId, visible_to: 'family', parent_id: options.parentId } : {}),
    }));
}

export function buildShoppingCaptureRows(
  entry: EZParsedEntry,
  userId: string,
  options: TaskCaptureOptions = {},
): TaskCaptureRow[] {
  // Assignment only applies to the shared (family) shopping list.
  const type = entry.type === 'shopping_personal' ? 'shopping_personal' : 'shopping';
  const assignees = type === 'shopping' ? (options.assignedUserIds ?? []) : [];
  // Shared shopping MUST carry family_id, or RLS hides it from other members.
  const familyId = type === 'shopping' ? (options.familyId ?? null) : null;
  return entry.title
    // Split multi-item captures on commas AND the LANGUAGE'S "and" — the AI is
    // asked to comma-separate, but voice fallbacks arrive as "Milch und Brot",
    // "lait et pain", "latte e pane", "leche y pan", "leite e pão". The
    // conjunction is locale-scoped: splitting every language on bare "e"/"y"
    // would break English items like "vitamin E".
    .split(itemSplitRegex(options.lang))
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => ({
      title, type, user_id: userId, completed: false,
      ...(assignees.length ? { assigned_to_users: assignees } : {}),
      ...(familyId ? { family_id: familyId } : {}),
    }));
}

/**
 * Detects a "send a message to X" voice intent and pulls out the recipient name
 * + message body, for posting an @mention into the Family Channel. Deliberately
 * does NOT match "tell X to <do something>" — that's a task assignment, handled
 * via assignees. Returns null when it's not a message intent.
 */
export function parseMessageIntent(raw: string): { to: string; body: string } | null {
  const s = raw.trim();
  const patterns: RegExp[] = [
    // ── EN ──
    // "send a message to Sofia saying/that/: …"  ·  "send a message to Sofia …"
    /^(?:can you |please |could you )?send (?:a |an )?message to (\p{L}+)[,:]?\s+(?:saying |that |to say |: ?)?(.+)$/iu,
    // "send Sofia a message saying/that …"
    /^(?:can you |please |could you )?send (\p{L}+) a message(?:,| saying| that|:)?\s+(.+)$/iu,
    // "message Sofia: …"  ·  "text Sofia …"
    /^(?:message|text) (\p{L}+)[,:]?\s+(.+)$/iu,
    // "tell Sofia that …"  (only the "that" form — "tell X to …" is assignment)
    /^(?:can you |please )?tell (\p{L}+) that\s+(.+)$/iu,
    // "let Sofia know (that) …"
    /^(?:can you |please )?let (\p{L}+) know (?:that\s+)?(.+)$/iu,
    // ── DE ──  ("sag Sofia, sie soll …" is assignment — only "dass" forms here)
    /^(?:bitte )?schick(?:e)? (\p{L}+) eine nachricht[,:]?\s*(?:dass\s+)?(.+)$/iu,
    /^(?:bitte )?(?:schick(?:e)?|send(?:e)?) eine nachricht an (\p{L}+)[,:]?\s*(?:dass\s+)?(.+)$/iu,
    /^(?:bitte )?sag(?:e)? (\p{L}+), dass\s+(.+)$/iu,
    /^(?:bitte )?schreib(?:e)? (\p{L}+)[,:]?\s+(.+)$/iu,
    /^(?:bitte )?lass (\p{L}+) wissen[,:]?\s*(?:dass\s+)?(.+)$/iu,
    // ── FR ──  ("dis à Sofia de …" is assignment — only "que" forms)
    /^(?:peux-tu |s'il te pla[îi]t )?envoie(?:r)? un message [àa] (\p{L}+)[,:]?\s*(?:disant |que |: ?)?(.+)$/iu,
    /^(?:peux-tu )?dis [àa] (\p{L}+) que\s+(.+)$/iu,
    /^(?:peux-tu )?[ée]cris [àa] (\p{L}+)[,:]?\s+(.+)$/iu,
    /^fais savoir [àa] (\p{L}+) que\s+(.+)$/iu,
    // ── IT ──  ("di' a Sofia di …" is assignment — only "che" forms)
    /^(?:puoi )?manda(?:re)? un messaggio a (\p{L}+)[,:]?\s*(?:dicendo |che |: ?)?(.+)$/iu,
    /^(?:puoi )?di(?:'|i)? a (\p{L}+) che\s+(.+)$/iu,
    /^(?:puoi )?scrivi a (\p{L}+)[,:]?\s+(.+)$/iu,
    // ── ES ──  ("dile a Sofia que haga …" ambiguous; "que" forms only)
    /^(?:puedes )?env[íi]a(?:le)? un mensaje a (\p{L}+)[,:]?\s*(?:diciendo |que |: ?)?(.+)$/iu,
    /^(?:puedes )?dile a (\p{L}+) que\s+(.+)$/iu,
    /^(?:puedes )?escribe(?:le)? a (\p{L}+)[,:]?\s+(.+)$/iu,
    // ── PT ──
    /^(?:podes )?envia(?:r)? uma mensagem (?:para|[àa]) (?:a |o )?(\p{L}+)[,:]?\s*(?:dizendo |que |a dizer |: ?)?(.+)$/iu,
    /^(?:podes )?diz(?:er)? [àa]o? (\p{L}+) que\s+(.+)$/iu,
    /^(?:podes )?escreve(?:r)? (?:para|[àa]) (?:a |o )?(\p{L}+)[,:]?\s+(.+)$/iu,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && m[1] && m[2] && m[2].trim().length >= 1) {
      return { to: m[1].trim(), body: m[2].trim() };
    }
  }
  return null;
}

/**
 * Deterministic assignment extraction for the AI-fallback path (and as a
 * cross-check on AI output). Matches only EXPLICIT assignment phrasings —
 * "assign to X", "tell/ask X to …", and their DE/FR/IT/ES/PT equivalents.
 * Returns the assignee first names plus the text with the assignment phrase
 * removed (so the title never carries "and assign to Sofia").
 * Deliberately narrow: "call Sofia" / "email Sofia" are tasks ABOUT Sofia,
 * never assignments — those verbs are excluded by requiring the explicit forms.
 */
export function extractAssignmentIntent(raw: string): { names: string[]; cleaned: string } {
  let cleaned = raw;
  const names: string[] = [];

  // Trailing/inline "…(and) assign (it/this) [to] X" — EN + DE + FR + IT + ES + PT
  // "to" is optional: users say "assign it Sophia" as often as "assign it to Sophia".
  const assignForms: RegExp[] = [
    /\s*(?:\band\b\s+)?\bassign(?:ed)?\s+(?:it\s+|this\s+)?(?:to\s+)?(\p{L}+)/giu,
    /\s*(?:\bund\b\s+)?\bweise?\s+(?:es\s+|das\s+|sie\s+)?(\p{L}+)\s+zu\b/giu,
    /\s*(?:\bund\b\s+)?\ban\s+(\p{L}+)\s+zuweisen\b/giu,
    /\s*(?:\bet\b\s+)?\bassigne(?:-le|-la)?\s+[àa]\s+(\p{L}+)/giu,
    /\s*(?:\be\b\s+)?\bassegna(?:l[oa])?\s+a\s+(\p{L}+)/giu,
    /\s*(?:\by\b\s+)?\bas[íi]gna(?:sel[oa]|l[oa])?\s+a\s+(\p{L}+)/giu,
    /\s*(?:\be\b\s+)?\batribui(?:-[oa])?\s+(?:a|à|ao)\s+(\p{L}+)/giu,
  ];
  for (const re of assignForms) {
    cleaned = cleaned.replace(re, (_m, name: string) => {
      names.push(name);
      return '';
    });
  }

  // "tell/ask X to Y" → assignee X, task Y (the "that" forms are messages,
  // handled by parseMessageIntent BEFORE this runs). EN + DE + FR + IT + ES + PT.
  if (!names.length) {
    const delegateForms: RegExp[] = [
      // "get X to" is excluded — "get ready to go" would false-match.
      /^(?:please\s+)?(?:tell|ask)\s+(\p{L}+)\s+to\s+(.+)$/iu,
      /^(?:bitte\s+)?sag(?:e)?\s+(\p{L}+),?\s+(?:er|sie)\s+soll\s+(.+)$/iu,
      // Bare "X soll Y" requires a capitalized name (no /i) to stay narrow.
      /^(?:bitte\s+)?([A-ZÄÖÜ]\p{L}+)\s+soll\s+(.+)$/u,
      /^demande\s+[àa]\s+(\p{L}+)\s+de\s+(.+)$/iu,
      /^(?:d[iì]'?|chiedi)\s+a\s+(\p{L}+)\s+di\s+(.+)$/iu,
      /^(?:dile|p[íi]dele)\s+a\s+(\p{L}+)\s+que\s+(.+)$/iu,
      /^(?:diz|pede)\s+(?:à|ao|a)\s+(\p{L}+)\s+(?:que|para)\s+(.+)$/iu,
    ];
    for (const re of delegateForms) {
      const m = cleaned.match(re);
      if (m) {
        names.push(m[1]);
        cleaned = m[2];
        break;
      }
    }
  }

  return { names, cleaned: cleaned.replace(/\s{2,}/g, ' ').trim() };
}

/**
 * Drops assignees whose first name appears in the (cleaned) title. A real
 * assignment never leaves the name in the title (the parser strips assignment
 * phrases), so a surviving name means the task is ABOUT that person — "call
 * Sofia", "pick up Leo" — and assigning it to them would silently move a
 * personal task into the shared family list.
 */
export function dropAssigneesMentionedInTitle(
  assignees: string[] | null | undefined,
  title: string,
): string[] | null {
  if (!assignees?.length) return assignees ?? null;
  const kept = assignees.filter(a => {
    const fn = firstName(a);
    if (!fn) return false;
    const escaped = fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`(^|\\P{L})${escaped}(\\P{L}|$)`, 'iu').test(title);
  });
  return kept.length ? kept : null;
}

export function isFamilyCalendarIntent(rawInput: string): boolean {
  return (
    /\b(family|our|shared|gemeinsam|unsere|famille|familia|nossa|nostro)\b.{0,30}(agenda|calendar|kalender|calendrier|calendario)/i.test(rawInput) ||
    /\b(family agenda|family calendar|familien kalender|agenda famille|agenda familiar)\b/i.test(rawInput)
  );
}

interface CalendarCaptureOptions {
  id: string;
  now: Date;
  rawInput: string;
  userId?: string;
  appleCalendarId?: string;
  attendeeUserIds?: string[]; // resolved assignees → event attendees
}

export function buildCalendarCaptureItem(entry: EZParsedEntry, options: CalendarCaptureOptions) {
  let startDate: Date;
  if (entry.date && entry.time) {
    startDate = new Date(`${entry.date}T${entry.time}`);
  } else if (entry.date) {
    startDate = new Date(`${entry.date}T00:00:00`);
  } else {
    startDate = options.now;
  }

  let endDate = new Date(startDate.getTime() + 3_600_000);
  if (entry.endTime && entry.date) {
    const explicitEnd = new Date(`${entry.date}T${entry.endTime}`);
    if (explicitEnd > startDate) endDate = explicitEnd;
  }

  const isReminder = entry.type === 'reminder';
  const isFamilyEvent = isFamilyCalendarIntent(options.rawInput);

  // Attendees = explicit assignees, plus the creator when it's a "family" event.
  // A non-empty attendees list is what marks an event as shared/family elsewhere.
  const attendees = Array.from(new Set([
    ...(isFamilyEvent && options.userId ? [options.userId] : []),
    ...(options.attendeeUserIds ?? []),
  ]));

  return {
    id: options.id,
    title: entry.title,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    ...(isReminder ? { dueDate: startDate.toISOString(), completed: false } : {}),
    allDay: !entry.time,
    type: entry.type,
    color: isReminder ? '#6E8FE5' : '#D97B66',
    location: entry.location || undefined,
    notes: entry.notes || undefined,
    ...(attendees.length ? { attendees } : {}),
    ...(options.appleCalendarId ? { appleCalendarId: options.appleCalendarId } : {}),
  };
}
