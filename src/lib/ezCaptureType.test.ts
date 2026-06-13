import { describe, it, expect } from 'vitest';
import { initialLockedType } from './ezCaptureType';

describe('initialLockedType – defaultType must not lock (regression)', () => {
  // The bug: the global EZ orb (Home) passes defaultType 'event', and locking
  // from it pinned EVERY capture to a calendar Event — "add bananas to my
  // shopping list" showed as Event. Only a deliberate journal entry locks.
  it('Home/Calendar default "event" → NOT locked (auto-classify)', () =>
    expect(initialLockedType('event')).toBeNull());
  it('Lists default "task" → NOT locked', () =>
    expect(initialLockedType('task')).toBeNull());
  it('Shopping tab default "shopping" → NOT locked', () =>
    expect(initialLockedType('shopping')).toBeNull());
  it('"reminder" → NOT locked', () =>
    expect(initialLockedType('reminder')).toBeNull());
  it('no default (undefined) → NOT locked', () =>
    expect(initialLockedType(undefined)).toBeNull());
  it('Rituals default "journal" → locked to journal (deliberate entry)', () =>
    expect(initialLockedType('journal')).toBe('journal'));
});
