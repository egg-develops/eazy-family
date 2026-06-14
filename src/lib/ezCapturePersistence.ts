import type { CaptureType } from '@/lib/intentClassifier';

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

/**
 * Resolve parsed assignee names (first names from the voice query) to family
 * member user ids. Matches on first name, case-insensitive. "me"/"myself"/"I"
 * and the user's own first name resolve to self. Unmatched names are dropped.
 * Deduplicated, order-preserving.
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
    const match = members.find(m => firstName(m.name) === fn);
    if (match) add(match.user_id);
  }
  return out;
}

export interface TaskCaptureOptions {
  assignedUserIds?: string[];
  familyId?: string | null;
  /** When set, the task is created as an ITEM inside this shared list. */
  parentId?: string | null;
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
  // If assigned to anyone other than the creator, it must be a SHARED family
  // task — a personal task ('task') is only visible to its creator, so the
  // assignee would never see it (RLS). It also lands as an ITEM inside a shared
  // list (parentId) so it renders as a row with an assignee pill, not as an
  // empty list header. Needs a family + a parent list to share into.
  const hasOthers = assignees.some(id => id !== userId);
  const isShared = hasOthers && !!options.familyId && !!options.parentId;

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
  return entry.title
    .split(/[,;\n]|\band\b/i)
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => ({
      title, type, user_id: userId, completed: false,
      ...(assignees.length ? { assigned_to_users: assignees } : {}),
      ...(assignees.length && options.familyId ? { family_id: options.familyId } : {}),
    }));
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
