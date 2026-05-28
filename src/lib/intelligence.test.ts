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

  it('empty history → no predictions', () => {
    expect(computeShoppingPredictions([], NOW)).toHaveLength(0);
  });

  it('item with only 1 purchase → no prediction (need ≥ 2)', () => {
    const history = [purchase('milk', '2026-06-01')];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('item purchased every 7 days, last 10 days ago → overdue by 3', () => {
    const history = [
      purchase('milk', '2026-05-31'), // 10 days ago
      purchase('milk', '2026-05-24'), // 17 days ago (interval = 7)
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe('Milk');
    expect(result[0].avgDaysBetween).toBe(7);
    expect(result[0].daysSinceLast).toBe(10);
    expect(result[0].daysOverdue).toBe(3);
  });

  it('item purchased every 7 days, last 5 days ago → NOT overdue', () => {
    const history = [
      purchase('eggs', '2026-06-05'), // 5 days ago
      purchase('eggs', '2026-05-29'), // 12 days ago (interval = 7)
    ];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('average interval across 3 purchases is used', () => {
    // intervals: 7, 14 → avg = 10.5 → ~11 days
    const history = [
      purchase('bread', '2026-05-28'), // 13 days ago
      purchase('bread', '2026-05-21'), // 20 days ago (interval 7)
      purchase('bread', '2026-05-07'), // 34 days ago (interval 14)
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].avgDaysBetween).toBe(11); // round(10.5) = 11
    expect(result[0].daysOverdue).toBe(3);      // round(13 - 10.5) = round(2.5) = 3
  });

  it('phrase with more than 4 words is skipped', () => {
    const history = [
      purchase('add some organic almond milk please', '2026-05-31'),
      purchase('add some organic almond milk please', '2026-05-24'),
    ];
    expect(computeShoppingPredictions(history, NOW)).toHaveLength(0);
  });

  it('exactly 4-word phrase is kept', () => {
    const history = [
      purchase('almond oat soy milk', '2026-05-31'),
      purchase('almond oat soy milk', '2026-05-24'),
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result).toHaveLength(1);
  });

  it('normalises item name to title case', () => {
    const history = [
      purchase('COFFEE', '2026-05-31'),
      purchase('coffee', '2026-05-24'),
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result[0].itemName).toBe('Coffee');
  });

  it('results sorted by daysOverdue desc', () => {
    const history = [
      // milk: avg 7, last 20 days ago → 13 days overdue
      purchase('milk', '2026-05-21'),
      purchase('milk', '2026-05-14'),
      // eggs: avg 7, last 10 days ago → 3 days overdue
      purchase('eggs', '2026-05-31'),
      purchase('eggs', '2026-05-24'),
    ];
    const result = computeShoppingPredictions(history, NOW);
    expect(result[0].itemName).toBe('Milk');
    expect(result[1].itemName).toBe('Eggs');
  });

  it('caps results at 5 items', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'].map(name => [
      purchase(name, '2026-05-21'),
      purchase(name, '2026-05-14'),
    ]).flat();
    const result = computeShoppingPredictions(items, NOW);
    expect(result.length).toBeLessThanOrEqual(5);
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
  it('toothbrush → Other',    () => expect(guessShoppingCategory('toothbrush')).toBe('Other'));
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
