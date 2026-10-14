import type { CaptureType } from '@/lib/intentClassifier';

/**
 * Multi-entry capture: shape handling for the AI parse reply.
 *
 * One utterance can legitimately contain several items of DIFFERENT types
 * ("add milk to the shopping list and clean the terrace on Tuesday"). The
 * parser therefore returns `{ entries: [...] }`, and this module turns whatever
 * actually comes back — an array, an `entries` wrapper, or a single bare object
 * from an older/forgetful reply — into a clean, capped, de-duplicated list.
 *
 * Same-type items on the same day stay in ONE entry with a comma-separated
 * title: `buildShoppingCaptureRows` / `buildTaskCaptureRows` already split
 * those into rows, and that path handles the locale-specific "and" too.
 */

/** Hard cap on entries committed from a single utterance. */
export const MAX_CAPTURE_ENTRIES = 6;

export interface RawAiEntry {
  type?: CaptureType | string | null;
  title?: string | null;
  date?: string | null;
  time?: string | null;
  endTime?: string | null;
  location?: string | null;
  assignees?: string[] | null;
  reminder?: string | null;
  notes?: string | null;
  mood?: string | null;
  /**
   * The fragment of the utterance this entry came from. With several entries,
   * keyword guards (shopping-vs-task, personal-vs-family scope, shared
   * destination, family-calendar intent) MUST run against the entry's own
   * fragment: run against the whole utterance, "dinner at 7 on Friday and add
   * wine to my list" turns the dinner event into a shopping item.
   */
  source?: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Normalizes the parse reply into a list of candidate entries:
 * accepts `{entries:[…]}`, a bare array, or a single entry object; drops
 * entries with no usable title; de-duplicates on type + title; caps the count.
 */
export function coerceEntries(raw: unknown): RawAiEntry[] {
  let list: unknown[];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (isRecord(raw) && Array.isArray(raw.entries)) {
    list = raw.entries;
  } else if (isRecord(raw)) {
    list = [raw];
  } else {
    return [];
  }

  const out: RawAiEntry[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    if (!isRecord(item)) continue;
    const title = str(item.title);
    if (!title) continue;
    const type = str(item.type);
    const key = `${type.toLowerCase()}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...(item as RawAiEntry), title });
    if (out.length >= MAX_CAPTURE_ENTRIES) break;
  }

  return out;
}

/**
 * The text that keyword guards should run against for this entry.
 * A single entry is guarded against the whole utterance (unchanged behaviour,
 * and the destination phrases a guard needs — "to my shopping list" — are
 * stripped from the title by design). Several entries each fall back to their
 * own fragment, then their title.
 */
export function guardScopeFor(
  entry: RawAiEntry,
  fullText: string,
  entryCount: number,
): string {
  if (entryCount <= 1) return fullText;
  return str(entry.source) || str(entry.title) || fullText;
}
