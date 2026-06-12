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
  type: 'task' | 'shopping' | 'shopping_personal';
  user_id: string;
  completed: false;
  due_date?: string | null;
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

export function buildTaskCaptureRows(entry: EZParsedEntry, userId: string): TaskCaptureRow[] {
  const dueDate = entry.date
    ? new Date(`${entry.date}T${entry.time ?? '00:00:00'}`).toISOString()
    : null;
  return entry.title
    .split(/[,;\n]/)
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => ({ title, type: 'task', user_id: userId, completed: false, due_date: dueDate }));
}

export function buildShoppingCaptureRows(entry: EZParsedEntry, userId: string): TaskCaptureRow[] {
  const type = entry.type === 'shopping_personal' ? 'shopping_personal' : 'shopping';
  return entry.title
    .split(/[,;\n]|\band\b/i)
    .map(title => title.trim())
    .filter(Boolean)
    .map(title => ({ title, type, user_id: userId, completed: false }));
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
    ...(isFamilyEvent && options.userId ? { attendees: [options.userId] } : {}),
    ...(options.appleCalendarId ? { appleCalendarId: options.appleCalendarId } : {}),
  };
}
