/**
 * Pure intelligence functions — extracted from hooks and pages so they can be
 * unit-tested without React or Supabase dependencies.
 *
 * Hooks import these and wire them to real data; tests call them directly.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;        // caller provides default end (start + 1h) if not in DB
  allDay?: boolean;
  location?: string;
}

export interface ConflictPair {
  eventA: CalEvent;
  eventB: CalEvent;
}

export interface ShoppingHistoryRow {
  itemName: string;
  purchasedAt: Date;
}

export interface ShoppingPrediction {
  itemName: string;
  avgDaysBetween: number;
  daysSinceLast: number;
  daysOverdue: number;
}

export interface TaskRow {
  id: string;
  title: string;
  type: string;
  completed: boolean;
  due_date: string | null;
}

// ── 1. Scheduling conflict detection ─────────────────────────────────────────

/**
 * Returns all overlapping pairs from a list of events (non-all-day only).
 * Two events overlap when: a.start < b.end && b.start < a.end
 * Caller is responsible for filtering to the desired window (e.g. next 7 days).
 */
export function detectConflicts(events: CalEvent[]): ConflictPair[] {
  const timed = events.filter(e => !e.allDay);
  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (a.start < b.end && b.start < a.end) {
        conflicts.push({ eventA: a, eventB: b });
      }
    }
  }
  return conflicts;
}

// ── 2. Stale task scoring ─────────────────────────────────────────────────────

export interface StaleScore {
  daysSinceUpdate: number;
  isEscalated: boolean; // 14+ days → suggest delegate or drop
}

/**
 * Returns how stale a task is relative to `now`.
 * A task is "stale" when daysSinceUpdate >= 7.
 * It is "escalated" when daysSinceUpdate >= 14.
 */
export function scoreStaleTask(updatedAt: Date, now: Date): StaleScore {
  const ms = now.getTime() - updatedAt.getTime();
  const days = Math.round(ms / 86400000);
  return { daysSinceUpdate: days, isEscalated: days >= 14 };
}

// ── 3. Shopping purchase history → predictions ───────────────────────────────

/**
 * Given raw purchase history (desc or any order), compute which items are
 * overdue based on average repurchase interval.
 *
 * Rules:
 *  - Item needs ≥ 2 purchases to build an interval
 *  - Phrases longer than 4 words are skipped (likely unprocessed voice input)
 *  - An item is "overdue" when daysSinceLast > avgDaysBetween
 *  - Results sorted by daysOverdue desc, capped at top 5
 */
export function computeShoppingPredictions(
  history: ShoppingHistoryRow[],
  now: Date,
): ShoppingPrediction[] {
  // Group by normalised item name
  const byItem: Record<string, Date[]> = {};
  for (const row of history) {
    const key = row.itemName.toLowerCase().trim();
    if (!byItem[key]) byItem[key] = [];
    byItem[key].push(row.purchasedAt);
  }

  const preds: ShoppingPrediction[] = [];

  for (const [name, dates] of Object.entries(byItem)) {
    if (dates.length < 2) continue;
    if (name.split(' ').length > 4) continue;

    // Sort desc so dates[0] is most recent
    dates.sort((a, b) => b.getTime() - a.getTime());

    const intervals: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = (dates[i].getTime() - dates[i + 1].getTime()) / 86400000;
      intervals.push(diff);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const daysSince = (now.getTime() - dates[0].getTime()) / 86400000;
    const overdue = daysSince - avg;

    if (overdue > 0) {
      preds.push({
        itemName: name.charAt(0).toUpperCase() + name.slice(1),
        avgDaysBetween: Math.round(avg),
        daysSinceLast: Math.round(daysSince),
        daysOverdue: Math.round(overdue),
      });
    }
  }

  preds.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return preds.slice(0, 5);
}

/**
 * Cleans a raw voice/text string before logging as a purchase history entry.
 * Strips leading command verbs and trailing list destinations.
 * Returns empty string if result is >4 words (not suitable for history).
 */
export function cleanPurchaseItem(raw: string): string {
  const cleaned = raw
    .replace(/^(please\s+)?(add|buy|get|pick up|grab|i need|we need|put)\s+/i, '')
    .replace(/\s+to\s+(my|our|the)\s+(shopping\s+)?list\s*$/i, '')
    .toLowerCase()
    .trim();
  if (!cleaned || cleaned.split(' ').length > 4) return '';
  return cleaned;
}

// ── 4. Shopping category heuristic ───────────────────────────────────────────

export type ShoppingCategory = 'Produce' | 'Dairy' | 'Meat' | 'Bakery' | 'Household' | 'Baby' | 'Drinks' | 'Other';

export function guessShoppingCategory(title: string): ShoppingCategory {
  const t = title.toLowerCase();
  // Check Drinks before Produce so "orange juice", "apple juice" → Drinks not Produce
  if (/\bjuice\b|water|coffee|tea|beer|wine|soda|drink|beverage|smoothie/.test(t)) return 'Drinks';
  if (/apple|banana|orange|lemon|lime|lettuce|tomato|carrot|spinach|kale|fruit|vegetable|avocado|onion|garlic|potato|pepper|celery|cucumber/.test(t)) return 'Produce';
  if (/\bmilk\b|cheese|yogurt|butter|cream|egg|dairy|oat milk|almond milk|soy milk/.test(t)) return 'Dairy';
  if (/chicken|beef|pork|lamb|fish|salmon|tuna|shrimp|meat|turkey|ham|bacon|sausage/.test(t)) return 'Meat';
  if (/bread|bagel|muffin|cake|pastry|croissant|oatmeal|oat|cereal|granola|flour|rice|pasta|noodle/.test(t)) return 'Bakery';
  if (/paper|soap|detergent|cleaning|towel|toilet|sponge|trash|bag|foil|wrap|wipe/.test(t)) return 'Household';
  if (/diaper|formula|baby|puree/.test(t)) return 'Baby';
  return 'Other';
}

// ── 5. Task category heuristic ────────────────────────────────────────────────

export type TaskCategory = 'Kids' | 'Admin' | 'Home' | 'Personal';

export function guessTaskCategory(title: string): TaskCategory {
  const lower = title.toLowerCase();
  if (/school|homework|lesson|class|pick up|drop off|practice|kid|child|son|daughter/.test(lower)) return 'Kids';
  if (/budget|bill|review|admin|account|insurance|tax|bank|report/.test(lower)) return 'Admin';
  if (/clean|laundry|water|plant|groceries|cook|kitchen|garden|fix|repair|furnace|filter/.test(lower)) return 'Home';
  return 'Personal';
}

// ── 6. Ritual emoji picker ────────────────────────────────────────────────────

export function pickRitualEmoji(title: string): string {
  const t = title.toLowerCase();
  if (/morning|sunrise|wake|rise|start/.test(t)) return '☀️';
  if (/evening|night|sunset|bed|sleep|wind/.test(t)) return '🌙';
  if (/run|jog|workout|gym|sport|exercise|train|cardio/.test(t)) return '🏃';
  if (/yoga|meditat|mindful|breath|calm|peace/.test(t)) return '🧘';
  if (/love|hug|family|togeth|connect|bond|couple/.test(t)) return '❤️';
  if (/read|book|learn|study|library/.test(t)) return '📚';
  if (/music|sing|song|guitar|piano|instrument/.test(t)) return '🎵';
  if (/garden|plant|nature|outdoor|fresh|walk|hike/.test(t)) return '🌿';
  if (/tea|coffee|drink|water|juice|smoothie/.test(t)) return '🍵';
  if (/journal|write|diary|reflect|note/.test(t)) return '✍️';
  if (/strength|lift|push|pull|weight/.test(t)) return '💪';
  if (/goal|target|focus|achieve|plan|review/.test(t)) return '🎯';
  if (/clean|tidy|organiz|declutter/.test(t)) return '🧹';
  if (/cook|meal|food|prep|lunch|dinner|breakfast/.test(t)) return '🍳';
  if (/kid|child|parent|dad|mom|story|stoytime/.test(t)) return '👨‍👩‍👧';
  if (/art|draw|paint|sketch|creat/.test(t)) return '🎨';
  if (/bath|shower|groom|hygien|skin/.test(t)) return '🛁';
  if (/swim|pool|lap/.test(t)) return '🏊';
  if (/bike|cycl|ride/.test(t)) return '🚴';
  if (/stretch|flex|mobility/.test(t)) return '🤸';
  if (/dog|pet|animal/.test(t)) return '🐕';
  if (/nap|rest|relax/.test(t)) return '💤';
  if (/sun|dawn|dusk|golden/.test(t)) return '🌅';
  if (/screen|phone|digital|detox/.test(t)) return '📵';
  if (/vitamin|supplement|pill|health/.test(t)) return '💊';
  if (/gratitude|thank|bless/.test(t)) return '🙏';
  if (/15 min|quick|short|brief/.test(t)) return '⏱️';
  return '✨';
}

// ── 7. Task time-bucket filtering ─────────────────────────────────────────────

export type TimeView = 'today' | 'upcoming' | 'complete';

/**
 * Filters a flat task list into the given time bucket.
 * `today`    — incomplete tasks with no due_date OR due_date <= endOfTomorrow
 * `upcoming` — incomplete tasks with due_date strictly after endOfTomorrow
 * `complete` — any completed task
 *
 * @param tasks     flat task array (any type field; caller pre-filters if needed)
 * @param view      which bucket
 * @param now       reference date (injected for testability)
 */
export function filterTasksByTime(tasks: TaskRow[], view: TimeView, now: Date): TaskRow[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return tasks.filter(t => {
    if (view === 'today') {
      if (t.completed) return false;
      if (!t.due_date) return true;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d <= tomorrow;
    }
    if (view === 'upcoming') {
      if (t.completed) return false;
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d > tomorrow;
    }
    if (view === 'complete') return t.completed;
    return false;
  });
}
