export type CaptureType = 'event' | 'task' | 'shopping' | 'reminder' | 'ritual' | 'journal';

/**
 * Keyword-based intent classifier — deterministic fallback used when the AI
 * is unavailable or returns a misclassification. Also used as a guard to
 * override clearly wrong AI results (e.g. AI says "event" for a shopping phrase).
 */
export function classifyText(text: string): CaptureType {
  const lower = text.toLowerCase();

  if (
    /\b(shopping list|grocery list|groceries|to buy)\b/.test(lower) ||
    /\b(buy|get|grab|pick up)\b/.test(lower) ||
    /\b(add|put)\b.+\b(shopping list|grocery list|groceries|list)\b/.test(lower)
  ) return 'shopping';

  if (/\b(remind|don't forget|remember to|don't let me forget)\b/.test(lower)) return 'reminder';

  if (/\b(feel|journal|today i|grateful|gratitude|reflection|dear diary)\b/.test(lower)) return 'journal';

  if (/\b(ritual|habit|morning|evening routine|daily)\b/.test(lower)) return 'ritual';

  if (
    /\b(task|todo|to-do|clean|wash|water|organis|organiz|tidy|fix|repair|mow|vacuum|sweep|mop|call|email|book|return|drop off|finish|complete)\b/.test(lower)
  ) return 'task';

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
    /\b(buy|get|grab|pick up)\b/.test(lower) ||
    /\b(add|put)\b.+\b(shopping list|grocery list|groceries|list)\b/.test(lower);
  const isObviouslyTask =
    /\b(clean|wash|water|organis|fix|repair|mow|vacuum|call|email|book)\b/.test(lower);

  if (aiType === 'event' && isObviouslyShopping) return 'shopping';
  if (aiType === 'event' && isObviouslyTask && !aiDate && !aiTime) return 'task';
  return aiType;
}
