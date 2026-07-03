import { describe, it, expect } from 'vitest';
import {
  detectConflicts,
  scoreStaleTask,
  computeShoppingPredictions,
  cleanPurchaseItem,
  guessShoppingCategory,
  guessTaskCategory,
  pickRitualEmoji,
  filterTasksByTime,
  type CalEvent,
  type ShoppingHistoryRow,
  type TaskRow,
} from './intelligence';

// ── Helpers ───────────────────────────────────────────────────────────────────

const d = (iso: string) => new Date(iso);

/** Build a CalEvent with optional defaults */
function ev(id: string, start: string, end: string, allDay = false): CalEvent {
  return { id, title: `Event ${id}`, start: d(start), end: d(end), allDay };
}

/** Build a purchase history row */
function purchase(itemName: string, purchasedAt: string): ShoppingHistoryRow {
  return { itemName, purchasedAt: d(purchasedAt) };
}

/** Build a task row */
function task(id: string, opts: Partial<TaskRow> = {}): TaskRow {
  return { id, title: `Task ${id}`, type: 'task', completed: false, due_date: null, ...opts };
}

// ── 1. detectConflicts ────────────────────────────────────────────────────────

describe('detectConflicts', () => {
  it('no events → no conflicts', () => {
    expect(detectConflicts([])).toHaveLength(0);
  });

  it('single event → no conflicts', () => {
    expect(detectConflicts([ev('a', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z')])).toHaveLength(0);
  });

  it('two non-overlapping events → no conflict', () => {
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
      ev('b', '2026-06-01T10:00:00Z', '2026-06-01T11:00:00Z'), // starts exactly when a ends
    ];
    expect(detectConflicts(events)).toHaveLength(0);
  });

  it('b starts one minute before a ends → conflict', () => {
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
      ev('b', '2026-06-01T09:59:00Z', '2026-06-01T11:00:00Z'),
    ];
    const result = detectConflicts(events);
    expect(result).toHaveLength(1);
    expect(result[0].eventA.id).toBe('a');
    expect(result[0].eventB.id).toBe('b');
  });

  it('fully overlapping events → conflict', () => {
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T11:00:00Z'),
      ev('b', '2026-06-01T09:30:00Z', '2026-06-01T10:30:00Z'), // b inside a
    ];
    expect(detectConflicts(events)).toHaveLength(1);
  });

  it('three events all overlapping → 3 conflict pairs', () => {
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T11:00:00Z'),
      ev('b', '2026-06-01T09:30:00Z', '2026-06-01T10:30:00Z'),
      ev('c', '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z'),
    ];
    expect(detectConflicts(events)).toHaveLength(3);
  });

  it('all-day events are excluded', () => {
    const events = [
      ev('a', '2026-06-01T00:00:00Z', '2026-06-01T23:59:00Z', true),
      ev('b', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z', true),
    ];
    expect(detectConflicts(events)).toHaveLength(0);
  });

  it('mix of all-day and timed — only timed events conflict', () => {
    const events = [
      ev('allday', '2026-06-01T00:00:00Z', '2026-06-02T00:00:00Z', true),
      ev('x', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
      ev('y', '2026-06-01T09:30:00Z', '2026-06-01T10:30:00Z'),
    ];
    const result = detectConflicts(events);
    expect(result).toHaveLength(1);
    expect(result[0].eventA.id).toBe('x');
    expect(result[0].eventB.id).toBe('y');
  });

  it('same start AND end → conflict (zero-length tolerance)', () => {
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
      ev('b', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
    ];
    expect(detectConflicts(events)).toHaveLength(1);
  });

  it('back-to-back events (no gap, no overlap) → no conflict', () => {
    // a ends exactly when b starts — not a conflict
    const events = [
      ev('a', '2026-06-01T09:00:00Z', '2026-06-01T10:00:00Z'),
      ev('b', '2026-06-01T10:00:00Z', '2026-06-01T11:00:00Z'),
    ];
    expect(detectConflicts(events)).toHaveLength(0);
  });
});

// ── 2. scoreStaleTask ─────────────────────────────────────────────────────────

describe('scoreStaleTask', () => {
  const NOW = d('2026-06-10T12:00:00Z');

  it('updated today → 0 days, not escalated', () => {
    const score = scoreStaleTask(d('2026-06-10T08:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(0);
    expect(score.isEscalated).toBe(false);
  });

  it('updated 6 days ago → not stale threshold (but still scored)', () => {
    const score = scoreStaleTask(d('2026-06-04T12:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(6);
    expect(score.isEscalated).toBe(false);
  });

  it('updated exactly 7 days ago → 7 days, not escalated', () => {
    const score = scoreStaleTask(d('2026-06-03T12:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(7);
    expect(score.isEscalated).toBe(false);
  });

  it('updated 13 days ago → not yet escalated', () => {
    const score = scoreStaleTask(d('2026-05-28T12:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(13);
    expect(score.isEscalated).toBe(false);
  });

  it('updated exactly 14 days ago → escalated', () => {
    const score = scoreStaleTask(d('2026-05-27T12:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(14);
    expect(score.isEscalated).toBe(true);
  });

  it('updated 30 days ago → escalated', () => {
    const score = scoreStaleTask(d('2026-05-11T12:00:00Z'), NOW);
    expect(score.daysSinceUpdate).toBe(30);
    expect(score.isEscalated).toBe(true);
  });
});

// ── 3. computeShoppingPredictions ────────────────────────────────────────────

describe('computeShoppingPredictions', () => {
  const NOW = d('2026-06-10T00:00:00Z');

  /** weekly purchases ending `lastDaysAgo` before NOW, `count` of them */
  function weekly(item: string, lastDaysAgo: number, count: number): ShoppingHistoryRow[] {
    const rows: ShoppingHistoryRow[] = [];
    for (let i = 0; i < count; i++) {
      const dt = new Date(NOW.getTime() - (lastDaysAgo + i * 7) * 86400000);
      rows.push({ itemName: item, purchasedAt: dt });
    }
    return rows;
  }

  it('empty history → no predictions', () => {
    expect(computeShoppingPredictions([], NOW)).toHaveLength(0);
  });

  it('1 purchase → none', () => {
    expect(computeShoppingPredictions([purchase('milk', '2026-06-01')], NOW)).toHaveLength(0);
  });

  it('only 2 purchases → none (one interval is not a rhythm)', () => {
    const history = [purchase('milk', '2026-05-31'), purchase('milk', '2026-05-24')];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('3+ regular weekly purchases, last 10 days ago → overdue by 3', () => {
    const result = computeShoppingPredictions(weekly('milk', 10, 4), NOW);
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('Milk');
    expect(result[0].avgDaysBetween).toBe(7);
    expect(result[0].daysSinceLast).toBe(10);
    expect(result[0].daysOverdue).toBe(3);
  });

  it('regular weekly but bought 4 days ago → NOT overdue (within 25% margin)', () => {
    expect(computeShoppingPredictions(weekly('eggs', 4, 4), NOW)).toHaveLength(0);
  });

  it('three purchases in the same shopping trip (span < 14d) → none', () => {
    const history = [
      purchase('chips', '2026-06-09'),
      purchase('chips', '2026-06-08'),
      purchase('chips', '2026-06-07'),
    ];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('irregular cadence (high variance) → none', () => {
    // intervals 2 and 30 → CV ≈ 0.88 > 0.6
    const history = [
      purchase('soda', '2026-06-05'),
      purchase('soda', '2026-06-03'),
      purchase('soda', '2026-05-04'),
    ];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('implausibly long interval (> 60 days) → none', () => {
    const history = [
      purchase('lightbulbs', '2026-06-01'),
      purchase('lightbulbs', '2026-03-23'), // ~70d
      purchase('lightbulbs', '2026-01-12'), // ~70d
    ];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('groups emoji/case variants and surfaces a clean name (the reported bug)', () => {
    const history = [
      { itemName: 'Bananas 🍌', purchasedAt: new Date(NOW.getTime() - 10 * 86400000) },
      { itemName: 'bananas',    purchasedAt: new Date(NOW.getTime() - 17 * 86400000) },
      { itemName: 'BANANAS',    purchasedAt: new Date(NOW.getTime() - 24 * 86400000) },
      { itemName: 'Bananas 🍌', purchasedAt: new Date(NOW.getTime() - 31 * 86400000) },
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('Bananas');
  });

  it('phrase with more than 4 words is skipped', () => {
    const history = weekly('add some organic almond milk please', 10, 4);
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('results sorted by daysOverdue desc', () => {
    const history = [
      ...weekly('milk', 20, 4), // avg 7, last 20d ago → overdue 13
      ...weekly('eggs', 10, 4), // avg 7, last 10d ago → overdue 3
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result[0].itemName).toBe('Milk');
    expect(result[1].itemName).toBe('Eggs');
  });

  it('caps results at 5 items', () => {
    const history = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap(name => weekly(name, 14, 4));
    expect(computeShoppingPredictions(history, NOW).length).toBeLessThanOrEqual(5);
  });
});

// ── 4. cleanPurchaseItem ──────────────────────────────────────────────────────

describe('cleanPurchaseItem', () => {
  it('strips "add ... to our shopping list"',   () => expect(cleanPurchaseItem('add milk to our shopping list')).toBe('milk'));
  it('strips "add ... to my list"',              () => expect(cleanPurchaseItem('add eggs to my list')).toBe('eggs'));
  it('strips "buy "',                            () => expect(cleanPurchaseItem('buy coffee')).toBe('coffee'));
  it('strips "get "',                            () => expect(cleanPurchaseItem('get some bread')).toBe('some bread'));
  it('strips "pick up "',                        () => expect(cleanPurchaseItem('pick up milk')).toBe('milk'));
  it('strips "grab "',                           () => expect(cleanPurchaseItem('grab peanut butter')).toBe('peanut butter'));
  it('strips "i need "',                         () => expect(cleanPurchaseItem('i need coffee')).toBe('coffee'));
  it('strips "we need "',                        () => expect(cleanPurchaseItem('we need olive oil')).toBe('olive oil'));
  it('strips "please add "',                     () => expect(cleanPurchaseItem('please add avocado')).toBe('avocado'));
  it('plain item name passes through',           () => expect(cleanPurchaseItem('milk')).toBe('milk'));
  it('lowercases the result',                    () => expect(cleanPurchaseItem('MILK')).toBe('milk'));
  it('strips emoji',                             () => expect(cleanPurchaseItem('Bananas 🍌')).toBe('bananas'));
  it('strips trailing punctuation',              () => expect(cleanPurchaseItem('eggs!')).toBe('eggs'));
  it('keeps apostrophes',                        () => expect(cleanPurchaseItem("kids' snacks")).toBe("kids' snacks"));
  it('>4 words → empty string (junk)',           () => expect(cleanPurchaseItem('some very long complicated phrase here')).toBe(''));
  it('empty input → empty string',               () => expect(cleanPurchaseItem('')).toBe(''));
});

// ── 5. guessShoppingCategory ──────────────────────────────────────────────────

describe('guessShoppingCategory', () => {
  // Produce
  it('apple → Produce',       () => expect(guessShoppingCategory('apple')).toBe('Produce'));
  it('avocado → Produce',     () => expect(guessShoppingCategory('avocado')).toBe('Produce'));
  it('spinach → Produce',     () => expect(guessShoppingCategory('spinach')).toBe('Produce'));
  it('Carrots → Produce',     () => expect(guessShoppingCategory('Carrots')).toBe('Produce'));

  // Dairy
  it('milk → Dairy',          () => expect(guessShoppingCategory('milk')).toBe('Dairy'));
  it('oat milk → Dairy',      () => expect(guessShoppingCategory('oat milk')).toBe('Dairy'));
  it('Greek yogurt → Dairy',  () => expect(guessShoppingCategory('Greek yogurt')).toBe('Dairy'));
  it('eggs → Dairy',          () => expect(guessShoppingCategory('eggs')).toBe('Dairy'));

  // Meat
  it('chicken → Meat',        () => expect(guessShoppingCategory('chicken breast')).toBe('Meat'));
  it('salmon → Meat',         () => expect(guessShoppingCategory('salmon fillet')).toBe('Meat'));
  it('bacon → Meat',          () => expect(guessShoppingCategory('bacon')).toBe('Meat'));

  // Bakery
  it('bread → Bakery',        () => expect(guessShoppingCategory('bread')).toBe('Bakery'));
  it('pasta → Bakery',        () => expect(guessShoppingCategory('pasta')).toBe('Bakery'));
  it('granola → Bakery',      () => expect(guessShoppingCategory('granola')).toBe('Bakery'));

  // Household
  it('toilet paper → Household', () => expect(guessShoppingCategory('toilet paper')).toBe('Household'));
  it('detergent → Household',    () => expect(guessShoppingCategory('detergent')).toBe('Household'));
  it('trash bags → Household',   () => expect(guessShoppingCategory('trash bags')).toBe('Household'));

  // Baby
  it('diapers → Baby',        () => expect(guessShoppingCategory('diapers')).toBe('Baby'));
  it('baby food → Baby',      () => expect(guessShoppingCategory('baby food')).toBe('Baby'));

  // Drinks
  it('wine → Drinks',         () => expect(guessShoppingCategory('wine')).toBe('Drinks'));
  it('coffee → Drinks',       () => expect(guessShoppingCategory('coffee')).toBe('Drinks'));
  it('orange juice → Drinks', () => expect(guessShoppingCategory('orange juice')).toBe('Drinks'));

  // Other
  it('toothbrush → Household (was Other)', () => expect(guessShoppingCategory('toothbrush')).toBe('Household'));
  it('unknown → Other',       () => expect(guessShoppingCategory('widget')).toBe('Other'));
});

// ── 6. guessTaskCategory ─────────────────────────────────────────────────────

describe('guessTaskCategory', () => {
  it('school → Kids',             () => expect(guessTaskCategory('school pickup')).toBe('Kids'));
  it('homework → Kids',           () => expect(guessTaskCategory('help with homework')).toBe('Kids'));
  it('pick up kids → Kids',       () => expect(guessTaskCategory('pick up kids from school')).toBe('Kids'));
  it('soccer practice → Kids',    () => expect(guessTaskCategory('soccer practice')).toBe('Kids'));

  it('budget → Admin',            () => expect(guessTaskCategory('review budget')).toBe('Admin'));
  it('insurance → Admin',         () => expect(guessTaskCategory('renew car insurance')).toBe('Admin'));
  it('tax return → Admin',        () => expect(guessTaskCategory('file tax return')).toBe('Admin'));
  it('bank statement → Admin',    () => expect(guessTaskCategory('check bank statement')).toBe('Admin'));

  it('clean → Home',              () => expect(guessTaskCategory('clean the kitchen')).toBe('Home'));
  it('laundry → Home',            () => expect(guessTaskCategory('do the laundry')).toBe('Home'));
  it('fix → Home',                () => expect(guessTaskCategory('fix the fence')).toBe('Home'));
  it('garden → Home',             () => expect(guessTaskCategory('garden weeding')).toBe('Home'));

  it('call dentist → Personal',   () => expect(guessTaskCategory('call the dentist')).toBe('Personal'));
  it('buy gift → Personal',       () => expect(guessTaskCategory('buy birthday gift')).toBe('Personal'));
  it('no keyword → Personal',     () => expect(guessTaskCategory('random unmatched task')).toBe('Personal'));
});

// ── 7. pickRitualEmoji ────────────────────────────────────────────────────────

describe('pickRitualEmoji', () => {
  it('morning → ☀️',             () => expect(pickRitualEmoji('morning walk')).toBe('☀️'));
  it('evening → 🌙',             () => expect(pickRitualEmoji('evening wind-down')).toBe('🌙'));
  it('run → 🏃',                 () => expect(pickRitualEmoji('daily run')).toBe('🏃'));
  it('workout → 🏃',             () => expect(pickRitualEmoji('home workout')).toBe('🏃'));
  it('yoga → 🧘',                () => expect(pickRitualEmoji('yoga session')).toBe('🧘'));
  it('meditat → 🧘',             () => expect(pickRitualEmoji('5 min meditation')).toBe('🧘'));
  it('read → 📚',                () => expect(pickRitualEmoji('read 20 pages')).toBe('📚'));
  it('journal → ✍️',             () => expect(pickRitualEmoji('write in journal')).toBe('✍️'));
  it('gratitude → 🙏',           () => expect(pickRitualEmoji('gratitude practice')).toBe('🙏'));
  it('coffee → 🍵',              () => expect(pickRitualEmoji('morning coffee')).toBe('☀️')); // morning wins (earlier rule)
  it('tea → 🍵',                 () => expect(pickRitualEmoji('herbal tea')).toBe('🍵'));
  it('cook → 🍳',                () => expect(pickRitualEmoji('cook dinner')).toBe('🍳'));
  it('clean → 🧹',               () => expect(pickRitualEmoji('clean the desk')).toBe('🧹'));
  it('vitamin → 💊',             () => expect(pickRitualEmoji('take vitamins')).toBe('💊'));
  it('screen detox → 📵',        () => expect(pickRitualEmoji('screen detox hour')).toBe('📵'));
  it('bike → 🚴',                () => expect(pickRitualEmoji('bike to work')).toBe('🚴'));
  it('swim → 🏊',                () => expect(pickRitualEmoji('swim 30 laps')).toBe('🏊'));
  it('dog walk → 🐕',            () => expect(pickRitualEmoji('walk the dog')).toBe('🌿')); // garden/walk wins
  it('quick → ⏱️',               () => expect(pickRitualEmoji('quick stretch')).toBe('🤸')); // stretch wins
  it('15 min → ⏱️',              () => expect(pickRitualEmoji('15 min breathing')).toBe('🧘')); // breath wins
  it('unmatched → ✨',            () => expect(pickRitualEmoji('something random')).toBe('✨'));
});

// ── 8. filterTasksByTime ──────────────────────────────────────────────────────

describe('filterTasksByTime', () => {
  // NOW = 2026-06-10 (Tuesday)
  const NOW = d('2026-06-10T12:00:00Z');
  // "tomorrow" = 2026-06-11 midnight

  it('today: includes task with no due_date (inbox)', () => {
    const tasks = [task('1', { due_date: null })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(1);
  });

  it('today: includes overdue task (due yesterday)', () => {
    const tasks = [task('1', { due_date: '2026-06-09T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(1);
  });

  it('today: includes task due today', () => {
    const tasks = [task('1', { due_date: '2026-06-10T23:59:00Z' })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(1);
  });

  it('today: includes task due tomorrow (boundary)', () => {
    const tasks = [task('1', { due_date: '2026-06-11T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(1);
  });

  it('today: excludes task due in 2 days', () => {
    const tasks = [task('1', { due_date: '2026-06-12T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(0);
  });

  it('today: excludes completed task', () => {
    const tasks = [task('1', { completed: true, due_date: null })];
    expect(filterTasksByTime(tasks, 'today', NOW)).toHaveLength(0);
  });

  it('upcoming: excludes task with no due_date', () => {
    const tasks = [task('1', { due_date: null })];
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(0);
  });

  it('upcoming: excludes task due today', () => {
    const tasks = [task('1', { due_date: '2026-06-10T23:59:00Z' })];
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(0);
  });

  it('upcoming: excludes task due tomorrow (is in "today" bucket)', () => {
    const tasks = [task('1', { due_date: '2026-06-11T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(0);
  });

  it('upcoming: includes task due day after tomorrow', () => {
    const tasks = [task('1', { due_date: '2026-06-12T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(1);
  });

  it('upcoming: excludes completed task', () => {
    const tasks = [task('1', { completed: true, due_date: '2026-06-15T00:00:00Z' })];
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(0);
  });

  it('complete: only returns completed tasks', () => {
    const tasks = [
      task('1', { completed: true }),
      task('2', { completed: false }),
      task('3', { completed: true, due_date: '2026-06-01T00:00:00Z' }),
    ];
    const result = filterTasksByTime(tasks, 'complete', NOW);
    expect(result).toHaveLength(2);
    expect(result.every(t => t.completed)).toBe(true);
  });

  it('mixed list correctly splits across buckets', () => {
    const tasks = [
      task('overdue',   { due_date: '2026-06-08T00:00:00Z' }),          // today
      task('inbox',     { due_date: null }),                              // today
      task('tomorrow',  { due_date: '2026-06-11T00:00:00Z' }),           // today (boundary)
      task('upcoming',  { due_date: '2026-06-15T00:00:00Z' }),           // upcoming
      task('done',      { completed: true }),                             // complete
    ];
    expect(filterTasksByTime(tasks, 'today',    NOW)).toHaveLength(3);
    expect(filterTasksByTime(tasks, 'upcoming', NOW)).toHaveLength(1);
    expect(filterTasksByTime(tasks, 'complete', NOW)).toHaveLength(1);
  });
});

// ── Multilingual category heuristics ─────────────────────────────────────────

describe('guessShoppingCategory – multilingual', () => {
  it('DE Milch → Dairy',        () => expect(guessShoppingCategory('Milch')).toBe('Dairy'));
  it('DE Äpfel → Produce',      () => expect(guessShoppingCategory('Äpfel')).toBe('Produce'));
  it('DE Hähnchen → Meat',      () => expect(guessShoppingCategory('Hähnchen')).toBe('Meat'));
  it('DE Brot → Bakery',        () => expect(guessShoppingCategory('Brot')).toBe('Bakery'));
  it('DE Waschmittel → Household', () => expect(guessShoppingCategory('Waschmittel')).toBe('Household'));
  it('FR fromage → Dairy',      () => expect(guessShoppingCategory('fromage')).toBe('Dairy'));
  it('FR pain → Bakery',        () => expect(guessShoppingCategory('pain')).toBe('Bakery'));
  it('FR jus d\'orange → Drinks', () => expect(guessShoppingCategory("jus d'orange")).toBe('Drinks'));
  it('IT latte → Dairy',        () => expect(guessShoppingCategory('latte')).toBe('Dairy'));
  it('IT pomodori → Produce',   () => expect(guessShoppingCategory('pomodori')).toBe('Produce'));
  it('ES leche → Dairy',        () => expect(guessShoppingCategory('leche')).toBe('Dairy'));
  it('ES pañales → Baby',       () => expect(guessShoppingCategory('pañales')).toBe('Baby'));
  it('PT pão → Bakery',         () => expect(guessShoppingCategory('pão')).toBe('Bakery'));
  it('PT queijo → Dairy',       () => expect(guessShoppingCategory('queijo')).toBe('Dairy'));
  it('EN unchanged: milk → Dairy', () => expect(guessShoppingCategory('milk')).toBe('Dairy'));
  it('EN unchanged: orange juice → Drinks', () => expect(guessShoppingCategory('orange juice')).toBe('Drinks'));
});

describe('guessTaskCategory – multilingual', () => {
  it('DE Hausaufgaben → Kids',  () => expect(guessTaskCategory('Hausaufgaben kontrollieren')).toBe('Kids'));
  it('DE Rechnung → Admin',     () => expect(guessTaskCategory('Rechnung bezahlen')).toBe('Admin'));
  it('DE Wäsche → Home',        () => expect(guessTaskCategory('Wäsche machen')).toBe('Home'));
  it('FR école → Kids',         () => expect(guessTaskCategory("chercher les enfants à l'école")).toBe('Kids'));
  it('FR facture → Admin',      () => expect(guessTaskCategory('payer la facture')).toBe('Admin'));
  it('IT giardino → Home',      () => expect(guessTaskCategory('sistemare il giardino')).toBe('Home'));
  it('ES deberes → Kids',       () => expect(guessTaskCategory('revisar los deberes')).toBe('Kids'));
  it('PT cozinha → Home',       () => expect(guessTaskCategory('limpar a cozinha')).toBe('Home'));
  it('fallback → Personal',     () => expect(guessTaskCategory('meditar')).toBe('Personal'));
});

describe('cleanPurchaseItem – multilingual command stripping', () => {
  it('DE kauf Milch',           () => expect(cleanPurchaseItem('kauf Milch')).toBe('milch'));
  it('DE Milch auf die Einkaufsliste', () => expect(cleanPurchaseItem('Milch auf die Einkaufsliste')).toBe('milch'));
  it('FR achète du lait',       () => expect(cleanPurchaseItem('achète du lait')).toBe('du lait'));
  it('IT compra il latte',      () => expect(cleanPurchaseItem('compra il latte')).toBe('il latte'));
  it('ES necesito pan',         () => expect(cleanPurchaseItem('necesito pan')).toBe('pan'));
  it('PT preciso de leite',     () => expect(cleanPurchaseItem('preciso de leite')).toBe('leite'));
  it('EN unchanged',            () => expect(cleanPurchaseItem('buy milk')).toBe('milk'));
});

describe('guessShoppingCategory – compound items (reported miscategorizations)', () => {
  it('peanut butter is not Dairy',   () => expect(guessShoppingCategory('peanut butter')).toBe('Other'));
  it('banana bread is Bakery',       () => expect(guessShoppingCategory('banana bread')).toBe('Bakery'));
  it('egg noodles are Bakery',       () => expect(guessShoppingCategory('egg noodles')).toBe('Bakery'));
  it('plain butter still Dairy',     () => expect(guessShoppingCategory('butter')).toBe('Dairy'));
  it('strawberries → Produce',       () => expect(guessShoppingCategory('strawberries')).toBe('Produce'));
  it('DE Erdbeeren → Produce',       () => expect(guessShoppingCategory('Erdbeeren')).toBe('Produce'));
  it('toothpaste → Household',       () => expect(guessShoppingCategory('toothpaste')).toBe('Household'));
  it('DE Zahnpasta → Household',     () => expect(guessShoppingCategory('Zahnpasta')).toBe('Household'));
  it('FR champignons → Produce',     () => expect(guessShoppingCategory('champignons')).toBe('Produce'));
});
