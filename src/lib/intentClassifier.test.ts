import { describe, it, expect } from 'vitest';
import { classifyText, guardAIType } from './intentClassifier';

// ── classifyText – shared shopping (default / "our") ────────────────────────

describe('classifyText – shopping (shared)', () => {
  it('no pronoun: buy keyword',                   () => expect(classifyText('buy milk')).toBe('shopping'));
  it('no pronoun: pick up',                       () => expect(classifyText('pick up peanut butter')).toBe('shopping'));
  it('no pronoun: grab',                          () => expect(classifyText('grab bread from the store')).toBe('shopping'));
  it('our shopping list',                         () => expect(classifyText('add coffee to our shopping list')).toBe('shopping'));
  it('our grocery list',                          () => expect(classifyText('add eggs to our grocery list')).toBe('shopping'));
  it('family list',                               () => expect(classifyText('add juice to the family list')).toBe('shopping'));
  it('the shopping list (no possessive)',         () => expect(classifyText('add wine to the shopping list')).toBe('shopping'));
  it('groceries (no possessive)',                 () => expect(classifyText('groceries: milk, eggs, bread')).toBe('shopping'));
  it('to buy',                                    () => expect(classifyText('coffee to buy')).toBe('shopping'));
});

// ── classifyText – personal shopping ("my") ─────────────────────────────────

describe('classifyText – shopping_personal', () => {
  it('my shopping list',                          () => expect(classifyText('add cottage cheese to my shopping list')).toBe('shopping_personal'));
  it('my grocery list',                           () => expect(classifyText('add oat milk to my grocery list')).toBe('shopping_personal'));
  it('my list',                                   () => expect(classifyText('add wine to my list')).toBe('shopping_personal'));
  it('my groceries',                              () => expect(classifyText('add apples to my groceries')).toBe('shopping_personal'));
  it('for me',                                    () => expect(classifyText('get protein bars for me')).toBe('shopping_personal'));
  it('put on my list',                            () => expect(classifyText('put avocado on my list')).toBe('shopping_personal'));
});

// ── classifyText – reminder ──────────────────────────────────────────────────

describe('classifyText – reminder', () => {
  it('remind me',         () => expect(classifyText('remind me to call mom')).toBe('reminder'));
  it("don't forget",      () => expect(classifyText("don't forget to pay rent")).toBe('reminder'));
  it('remember to',       () => expect(classifyText('remember to take out the trash')).toBe('reminder'));
});

// ── classifyText – journal ───────────────────────────────────────────────────

describe('classifyText – journal', () => {
  it('grateful',          () => expect(classifyText('grateful for a great day')).toBe('journal'));
  it('today i',           () => expect(classifyText('today i felt really proud of the kids')).toBe('journal'));
  it('dear diary',        () => expect(classifyText('dear diary, tough morning')).toBe('journal'));
  it('reflection',        () => expect(classifyText('evening reflection: feeling calm')).toBe('journal'));
});

// ── classifyText – ritual ────────────────────────────────────────────────────

describe('classifyText – ritual', () => {
  it('morning routine',   () => expect(classifyText('morning routine: meditation')).toBe('ritual'));
  it('daily habit',       () => expect(classifyText('daily walk with the dog')).toBe('ritual'));
  it('ritual keyword',    () => expect(classifyText('ritual: yoga before work')).toBe('ritual'));
});

// ── classifyText – task ──────────────────────────────────────────────────────

describe('classifyText – task', () => {
  it('clean',                     () => expect(classifyText('clean the kitchen')).toBe('task'));
  it('clean out (compound)',       () => expect(classifyText('clean out basement')).toBe('task'));
  it('clear',                     () => expect(classifyText('clear the garage')).toBe('task'));
  it('sort',                      () => expect(classifyText('sort through the mail')).toBe('task'));
  it('declutter',                 () => expect(classifyText('declutter the closet')).toBe('task'));
  it('wash',                      () => expect(classifyText('wash the car')).toBe('task'));
  it('call',                      () => expect(classifyText('call the dentist')).toBe('task'));
  it('fix',                       () => expect(classifyText('fix the leaky tap')).toBe('task'));
  it('mow',                       () => expect(classifyText('mow the lawn')).toBe('task'));
  it('email',                     () => expect(classifyText('email the school')).toBe('task'));
  it('pack',                      () => expect(classifyText('pack for the trip')).toBe('task'));
  it('unpack',                    () => expect(classifyText('unpack the boxes')).toBe('task'));
  // "my list" with a task verb should still be task, not shopping_personal
  it('"add to my list" with task verb → task', () =>
    expect(classifyText('add clean the terrace to my list')).toBe('task'));
});

// ── classifyText – event ─────────────────────────────────────────────────────

describe('classifyText – event', () => {
  it('tomorrow',          () => expect(classifyText("doctor's appointment tomorrow")).toBe('event'));
  it('day of week',       () => expect(classifyText('lunch with Sarah on Friday')).toBe('event'));
  it('time',              () => expect(classifyText('meeting at 3pm')).toBe('event'));
  it('birthday keyword',  () => expect(classifyText("Mia's birthday party")).toBe('event'));
  it('concert keyword',   () => expect(classifyText('concert next Saturday')).toBe('event'));
});

// ── guardAIType ──────────────────────────────────────────────────────────────

describe('guardAIType – personal scope correction', () => {
  it('AI says shopping, text has "my list" → shopping_personal', () =>
    expect(guardAIType('shopping', 'add coffee to my shopping list', null, null)).toBe('shopping_personal'));

  it('AI says shopping, text has "my groceries" → shopping_personal', () =>
    expect(guardAIType('shopping', 'add apples to my groceries', null, null)).toBe('shopping_personal'));

  it('AI says event, text is "our shopping list" → shopping (shared)', () =>
    expect(guardAIType('event', 'add coffee to our shopping list', null, null)).toBe('shopping'));

  it('AI says event, text is "my shopping list" → shopping_personal', () =>
    expect(guardAIType('event', 'add milk to my shopping list', null, null)).toBe('shopping_personal'));
});

describe('guardAIType – standard overrides', () => {
  it('AI says event, buy keyword → shopping', () =>
    expect(guardAIType('event', 'buy milk', null, null)).toBe('shopping'));

  it('AI says event, task text, no date/time → task', () =>
    expect(guardAIType('event', 'clean the bathroom', null, null)).toBe('task'));

  it('AI says event, task text, has date but no time → task (date = due_date)', () =>
    expect(guardAIType('event', 'clean the bathroom', '2026-06-01', null)).toBe('task'));

  it('AI says event, task text, has time → keep event', () =>
    expect(guardAIType('event', 'clean the bathroom', '2026-06-01', '10:00')).toBe('event'));

  it('"clean out basement" + AI date but no time → task (regression)', () =>
    expect(guardAIType('event', 'clean out basement', '2026-06-15', null)).toBe('task'));
});

describe('guardAIType – passes through correct AI results', () => {
  it('shopping_personal unchanged',  () =>
    expect(guardAIType('shopping_personal', 'add wine to my list', null, null)).toBe('shopping_personal'));

  it('task unchanged',               () =>
    expect(guardAIType('task', 'call the dentist', null, null)).toBe('task'));

  it('reminder unchanged',           () =>
    expect(guardAIType('reminder', 'remind me about rent', null, null)).toBe('reminder'));
});
