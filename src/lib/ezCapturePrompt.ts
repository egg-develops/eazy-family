import { MAX_CAPTURE_ENTRIES } from '@/lib/ezCaptureEntries';

/**
 * The EZ-capture extraction prompt.
 *
 * It lives here, out of the component, so the exact prompt that ships can be
 * exercised against the live `eazy-chat` function without a browser
 * (scripts/verify-ez-multi-entry.mjs) — EZ parsing regressions are not
 * catchable by unit tests alone, because the behaviour under test is the
 * model's (see CLAUDE.md §5.19).
 */
export interface ParsePromptInput {
  /** Today, "YYYY-MM-DD". */
  today: string;
  /** Today's weekday name, e.g. "Saturday". */
  dayOfWeek: string;
  /** Human label for the user's language, e.g. "German". */
  userLanguage: string;
  /** Swiss-German input (already normalized to Standard German upstream). */
  isSwissGerman?: boolean;
  /** Family member names, for resolving a spoken assignee. */
  rosterNames?: string[];
  /**
   * A dedicated single-purpose screen (journal from Rituals): one utterance
   * must stay one entry, or the user's text gets scattered across entries.
   */
  singleEntryOnly?: boolean;
}

export function buildParsePrompt(input: ParsePromptInput): string {
  const { today, dayOfWeek, userLanguage, isSwissGerman, singleEntryOnly } = input;

  // Give the parser the family roster so it can resolve a spoken assignee to
  // the right member — handling nicknames and speech mis-hearings the local
  // string matcher can't ("Cathi"/"Katrina" → "Catharina").
  const names = (input.rosterNames ?? []).map(n => n.trim()).filter(Boolean);
  const rosterHint = names.length
    ? ` The family members are: ${names.join(', ')}. Match the spoken assignee to the CLOSEST family member from this list — allowing for nicknames ("Cathi" → "Catharina") and likely speech mis-hearings ("Katrina" → "Catharina") — and return that member's EXACT name as written here. Return null if no family member is a plausible match.`
    : '';

  const langHint = isSwissGerman
    ? `Swiss German (dialect pre-normalized to Standard German). Keep the title in German — do not translate to English.`
    : `${userLanguage}. Parse date/time expressions correctly for this language. Keep the title in the user's language — do not translate to English.`;

  return `You are an NLP parser for a family scheduling app. Parse the user's input and return ONLY a valid JSON object of the form {"entries":[ … ]} — no markdown, no code fences, no explanation.

User's input language: ${langHint}

${singleEntryOnly
  ? 'Return EXACTLY ONE entry in "entries", holding everything the user said.'
  : `ONE UTTERANCE CAN CONTAIN SEVERAL ITEMS — return one entry per distinct item:
- Different TYPES → separate entries. "add milk to the shopping list and clean the terrace on Tuesday" → one shopping entry ("Milk") AND one task entry ("Clean the terrace", Tuesday).
- Same type but different dates/times → separate entries ("dentist Tuesday 3pm and parents evening Thursday 7pm").
- Same type sharing the same date → ONE entry with the titles comma-separated ("milk, bread, eggs").
- Never invent an entry, and never split a single item: most captures are exactly one entry. Split only where the user genuinely named separate things.
- At most ${MAX_CAPTURE_ENTRIES} entries.`}

TYPE CLASSIFICATION — pick exactly one per entry:
- "shopping": items to BUY for the family/shared list. Triggered by: "our shopping list", "the shopping list", "family list", "grocery list", or no possessive ("buy milk", "pick up bread").
- "shopping_personal": items to BUY for YOUR OWN personal list. Triggered by: "my shopping list", "my list", "my groceries", "for me". Example: "add wine to my list" → shopping_personal.
- "task": actions or chores to DO. Triggered by: clean, wash, water, organise, fix, repair, mow, vacuum, call, email, book, finish, return, tidy, take out, drop off — and their equivalents in ${userLanguage}. IMPORTANT: "Clean the terrace", "water the plants", "call dentist" are TASKS, not shopping items — even if phrased as "add X to my list".
- "event": time-specific appointment, meeting, or occurrence with a date/time.
- "reminder": "remind me to X".
- "ritual": habit, gratitude, or reflection entry.
- "journal": diary or feelings entry.

Fields of each entry:
- type: one of the types above
- title: ONLY the core subject — NEVER include date, time, location, command words, list-destination phrases, or assignment phrases. Strip ALL of: leading verbs ("add", "create", "schedule", "remind me to", "put", "book" and equivalents in ${userLanguage}), trailing destinations ("to my shopping list", "to our shopping list", "to the list", "to my list", "on the calendar", "on the schedule" and equivalents in ${userLanguage}), assignment phrases ("assign to X", "ask X to", "tell X to", "have X", "for X"), date/time phrases. For type "shopping" or "shopping_personal", ALWAYS separate multiple items with commas. For type "task", separate multiple tasks with commas.
- date: "YYYY-MM-DD" or null. Resolve ALL date references including ordinals. Today is ${today} — resolve to the NEXT occurrence if the date has not yet passed, otherwise the following month.
- time: "HH:MM" 24h or null.
- endTime: "HH:MM" 24h or null
- location: string or null
- assignees: array of the assignee's name, or null. Extract ONLY from explicit delegation phrases: "assign to X", "assign it X", "assign it to X", "assign this to X", "ask X to", "tell X to", "have X", "get X to", "for X", "X should" (and equivalents in ${userLanguage}).${rosterHint} Use ONLY the (matched) person's name in this array, never in the title. IMPORTANT: the OBJECT of an action is NOT an assignee — "call Sofia", "email the teacher", "pick up Leo from school" have assignees: null.
- reminder: human-readable string or null
- notes: string or null
- mood: string or null (journal only)
- source: the exact fragment of the user's input that this entry came from, copied verbatim (it scopes the app's keyword checks to the right part of the sentence). Omit only if you truly cannot tell.

Today is ${today} (${dayOfWeek}). Date resolution rules:
- "this week" = a date within the 7 days starting from today (${today}), not before today.
- "next week" = a date 7–14 days from today.
- "this weekend" = the nearest upcoming Saturday.
- Never resolve a relative date to a date in the past.

Return ONLY the raw JSON object with its "entries" array.`;
}
