import { describe, it, expect } from 'vitest';
import { coerceEntries, guardScopeFor, MAX_CAPTURE_ENTRIES } from './ezCaptureEntries';

describe('coerceEntries – accepts every shape the parser may reply with', () => {
  it('reads the documented {entries:[…]} wrapper', () => {
    const out = coerceEntries({ entries: [{ type: 'shopping', title: 'Milk' }, { type: 'task', title: 'Clean the terrace' }] });
    expect(out.map(e => e.title)).toEqual(['Milk', 'Clean the terrace']);
  });

  it('reads a bare array', () => {
    expect(coerceEntries([{ title: 'Milk' }])).toHaveLength(1);
  });

  it('wraps a single bare entry object (legacy single-entry reply)', () => {
    const out = coerceEntries({ type: 'event', title: 'Dentist', date: '2026-10-20', time: '15:00' });
    expect(out).toHaveLength(1);
    expect(out[0].time).toBe('15:00');
  });

  it('trims titles and drops entries with no usable title', () => {
    const out = coerceEntries({ entries: [{ title: '  Milk  ' }, { title: '   ' }, { title: null }, { notes: 'x' }] });
    expect(out).toEqual([expect.objectContaining({ title: 'Milk' })]);
  });

  it('de-duplicates on type + title, case-insensitively', () => {
    const out = coerceEntries({ entries: [{ type: 'shopping', title: 'Milk' }, { type: 'shopping', title: 'milk' }] });
    expect(out).toHaveLength(1);
  });

  it('keeps the same title under two different types', () => {
    const out = coerceEntries({ entries: [{ type: 'shopping', title: 'Wine' }, { type: 'task', title: 'Wine' }] });
    expect(out).toHaveLength(2);
  });

  it(`caps the list at ${MAX_CAPTURE_ENTRIES} entries`, () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `Item ${i}` }));
    expect(coerceEntries({ entries: many })).toHaveLength(MAX_CAPTURE_ENTRIES);
  });

  it('returns [] for junk instead of throwing', () => {
    expect(coerceEntries(null)).toEqual([]);
    expect(coerceEntries('nope')).toEqual([]);
    expect(coerceEntries(42)).toEqual([]);
    expect(coerceEntries({ entries: 'nope' })).toEqual([]);
    expect(coerceEntries([null, 7])).toEqual([]);
  });
});

describe('guardScopeFor – keyword guards must not read the whole utterance when there are several entries', () => {
  // The regression this prevents: guarding every entry against the full text
  // turns "dinner at 7 on Friday and add wine to my list" into TWO shopping
  // items, because the shopping keywords are present somewhere in the input.
  const full = 'dinner at 7 on friday and add wine to my list';

  it('single entry → the whole utterance (unchanged behaviour)', () => {
    expect(guardScopeFor({ title: 'Dinner' }, full, 1)).toBe(full);
  });

  it('several entries → the entry\'s own fragment', () => {
    expect(guardScopeFor({ title: 'Dinner', source: 'dinner at 7 on friday' }, full, 2))
      .toBe('dinner at 7 on friday');
    expect(guardScopeFor({ title: 'Wine', source: 'add wine to my list' }, full, 2))
      .toBe('add wine to my list');
  });

  it('several entries with no fragment → the title', () => {
    expect(guardScopeFor({ title: 'Dinner' }, full, 2)).toBe('Dinner');
  });

  it('several entries with neither → the whole utterance', () => {
    expect(guardScopeFor({ title: '' }, full, 2)).toBe(full);
  });
});
