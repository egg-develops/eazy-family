import { describe, it, expect } from 'vitest';
import { classifyText, guardAIType } from './intentClassifier';

// ── classifyText ────────────────────────────────────────────────────────────

describe('classifyText – shopping', () => {
  it('grocery list phrase', () => expect(classifyText('pick up milk and eggs')).toBe('shopping'));
  it('buy keyword', () => expect(classifyText('buy coffee')).toBe('shopping'));
  it('grab keyword', () => expect(classifyText('grab bread from the store')).toBe('shopping'));
  it('add to shopping list', () => expect(classifyText('add coffee to our shopping list')).toBe('shopping'));
  it('add to grocery list', () => expect(classifyText('add bananas to the grocery list')).toBe('shopping'));
  it('to buy phrase', () => expect(classifyText('coffee to buy')).toBe('shopping'));
  it('explicit groceries', () => expect(classifyText('groceries for the week')).toBe('shopping'));
});

describe('classifyText – reminder', () => {
  it('remind me', () => expect(classifyText("remind me to call mom")).toBe('reminder'));
  it("don't forget", () => expect(classifyText("don't forget to pay rent")).toBe('reminder'));
  it('remember to', () => expect(classifyText('remember to take out the trash')).toBe('reminder'));
});

describe('classifyText – journal', () => {
  it('grateful', () => expect(classifyText('grateful for a great day')).toBe('journal'));
  it('today i', () => expect(classifyText('today i felt really proud of the kids')).toBe('journal'));
  it('dear diary', () => expect(classifyText('dear diary, tough morning')).toBe('journal'));
  it('reflection', () => expect(classifyText('evening reflection: feeling calm')).toBe('journal'));
});

describe('classifyText – ritual', () => {
  it('morning routine', () => expect(classifyText('morning routine: meditation')).toBe('ritual'));
  it('daily habit', () => expect(classifyText('daily walk with the dog')).toBe('ritual'));
  it('ritual keyword', () => expect(classifyText('ritual: yoga before work')).toBe('ritual'));
});

describe('classifyText – task', () => {
  it('clean', () => expect(classifyText('clean the kitchen')).toBe('task'));
  it('wash', () => expect(classifyText('wash the car')).toBe('task'));
  it('call', () => expect(classifyText('call the dentist')).toBe('task'));
  it('fix', () => expect(classifyText('fix the leaky tap')).toBe('task'));
  it('mow', () => expect(classifyText('mow the lawn')).toBe('task'));
  it('email', () => expect(classifyText('email the school')).toBe('task'));
});

describe('classifyText – event', () => {
  it('tomorrow', () => expect(classifyText("doctor's appointment tomorrow")).toBe('event'));
  it('day of week', () => expect(classifyText('lunch with Sarah on Friday')).toBe('event'));
  it('time', () => expect(classifyText('meeting at 3pm')).toBe('event'));
  it('birthday keyword', () => expect(classifyText("Mia's birthday party")).toBe('event'));
  it('concert keyword', () => expect(classifyText('concert next Saturday')).toBe('event'));
});

// ── guardAIType ─────────────────────────────────────────────────────────────

describe('guardAIType – overrides wrong AI result', () => {
  it('AI says event but text is obviously shopping → shopping', () =>
    expect(guardAIType('event', 'add coffee to our shopping list', null, null)).toBe('shopping'));

  it('AI says event but text has buy → shopping', () =>
    expect(guardAIType('event', 'buy milk', null, null)).toBe('shopping'));

  it('AI says event, task text, no date/time → task', () =>
    expect(guardAIType('event', 'clean the bathroom', null, null)).toBe('task'));

  it('AI says event, task text, but has a date → keep event (scheduled task)', () =>
    expect(guardAIType('event', 'clean the bathroom', '2026-06-01', null)).toBe('event'));
});

describe('guardAIType – passes through correct AI results', () => {
  it('AI says shopping → shopping', () =>
    expect(guardAIType('shopping', 'get bananas', null, null)).toBe('shopping'));

  it('AI says task, no conflict → task', () =>
    expect(guardAIType('task', 'call the dentist', null, null)).toBe('task'));

  it('AI says reminder → reminder', () =>
    expect(guardAIType('reminder', 'remind me about rent', null, null)).toBe('reminder'));
});
