export type CaptureType = 'event' | 'task' | 'shopping' | 'shopping_personal' | 'reminder' | 'ritual' | 'journal';

// "my list/shopping/groceries" signals → personal list
const MY_LIST = /\b(my (shopping list|grocery list|groceries|list)|for me\b)/;
// "our/family/shared" signals → shared list
const OUR_LIST = /\b(our (shopping list|grocery list|groceries|list)|family (list|shopping)|shared list)/;
// Generic shopping triggers (no scope signal)
const BUY_VERBS = /\b(buy|get|grab|pick up)\b/;
const ADD_TO_LIST = /\b(add|put)\b.+\b(shopping list|grocery list|groceries|list)\b/;

function isPersonalScope(lower: string): boolean {
  return MY_LIST.test(lower) && !OUR_LIST.test(lower);
}

const TASK_VERBS = /\b(clean|clear|sort|declutter|organis|organiz|tidy|pack|unpack|fix|repair|mow|vacuum|sweep|mop|wash|water|call|email|book|return|drop off|finish|complete|task|todo|to-do)\b/;

/**
 * Keyword-based intent classifier — deterministic fallback used when the AI
 * is unavailable or returns a misclassification. Also used as a guard to
 * override clearly wrong AI results.
 */
export function classifyText(text: string): CaptureType {
  const lower = text.toLowerCase();

  // Strong shopping signals (buy/get/grab/pick up, explicit list names) take
  // precedence over task verbs — "buy milk and call dentist" is shopping context.
  const hasStrongShoppingSignal =
    /\b(shopping list|grocery list|groceries|to buy)\b/.test(lower) ||
    BUY_VERBS.test(lower);

  if (hasStrongShoppingSignal) {
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }

  // "add X to [my/our/the] list" — but only if X is not a task verb phrase.
  // e.g. "add cottage cheese to my list" → shopping_personal
  //      "add clean the terrace to my list" → task (task verb overrides)
  if (ADD_TO_LIST.test(lower)) {
    if (TASK_VERBS.test(lower)) return 'task';
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }

  if (/\b(remind|don't forget|remember to|don't let me forget)\b/.test(lower)) return 'reminder';

  if (/\b(feel|journal|today i|grateful|gratitude|reflection|dear diary)\b/.test(lower)) return 'journal';

  if (/\b(ritual|habit|morning|evening routine|daily)\b/.test(lower)) return 'ritual';

  if (TASK_VERBS.test(lower)) return 'task';

  if (
    /\b(tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+(am|pm)|at \d|o'clock)\b/.test(lower) ||
    /\b(appointment|meeting|dinner|lunch|birthday|wedding|event|concert)\b/.test(lower)
  ) return 'event';

  return 'event'; // safest default for ambiguous input
}

/**
 * Applies classifyText as a guard on an AI result.
 * Returns the corrected type if the AI was clearly wrong.
 */
export function guardAIType(
  aiType: CaptureType,
  rawText: string,
  aiDate: string | null,
  aiTime: string | null
): CaptureType {
  const lower = rawText.toLowerCase();
  const isObviouslyShopping =
    /\b(shopping list|grocery list|groceries|to buy)\b/.test(lower) ||
    BUY_VERBS.test(lower) ||
    ADD_TO_LIST.test(lower);
  const isObviouslyTask = TASK_VERBS.test(lower);

  if ((aiType === 'event' || aiType === 'shopping') && isObviouslyShopping) {
    return isPersonalScope(lower) ? 'shopping_personal' : 'shopping';
  }
  // A task verb overrides "event" even when AI adds a date (date → due_date).
  // Only a specific time (e.g. "at 3pm") is strong enough to keep it as event.
  if (aiType === 'event' && isObviouslyTask && !aiTime) return 'task';
  // Upgrade shopping → shopping_personal when keyword guard detects personal scope
  if (aiType === 'shopping' && isPersonalScope(lower)) return 'shopping_personal';
  return aiType;
}
