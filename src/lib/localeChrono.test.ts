import { describe, it, expect } from 'vitest';
import { parseDatesLocalized } from './localeChrono';

// Reference date: Wednesday 2026-07-01, 09:00 local.
const REF = new Date(2026, 6, 1, 9, 0, 0);

const day = (r: ReturnType<typeof parseDatesLocalized>[number]) =>
  r.start.date().toISOString().slice(0, 10);

describe('parseDatesLocalized – all six app languages', () => {
  it('EN: tomorrow at 3pm', () => {
    const r = parseDatesLocalized('dentist tomorrow at 3pm', REF, undefined, 'en');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
    expect(r[0].start.get('hour')).toBe(15);
  });

  it('DE: morgen um 15 Uhr', () => {
    const r = parseDatesLocalized('Zahnarzt morgen um 15 Uhr', REF, undefined, 'de');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
    expect(r[0].start.get('hour')).toBe(15);
  });

  it('FR: demain à 15h', () => {
    const r = parseDatesLocalized('dentiste demain à 15h', REF, undefined, 'fr');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
    expect(r[0].start.get('hour')).toBe(15);
  });

  it('IT: domani', () => {
    const r = parseDatesLocalized('dentista domani', REF, undefined, 'it');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
  });

  it('ES: mañana a las 3 de la tarde', () => {
    const r = parseDatesLocalized('dentista mañana a las 3 de la tarde', REF, undefined, 'es');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
  });

  it('PT: amanhã às 15:00', () => {
    const r = parseDatesLocalized('dentista amanhã às 15:00', REF, undefined, 'pt');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
  });

  it('DE weekday: nächsten Montag (forward)', () => {
    const r = parseDatesLocalized('Fußball nächsten Montag', REF, { forwardDate: true }, 'de');
    expect(r.length).toBeGreaterThan(0);
    // Monday after Wed 2026-07-01 is 2026-07-06
    expect(day(r[0])).toBe('2026-07-06');
  });

  it('falls back to English parsing when the locale parser finds nothing', () => {
    const r = parseDatesLocalized('meeting tomorrow', REF, undefined, 'de');
    expect(r.length).toBeGreaterThan(0);
    expect(day(r[0])).toBe('2026-07-02');
  });

  it('finds nothing in plain text without dates', () => {
    expect(parseDatesLocalized('Milch und Brot', REF, undefined, 'de')).toHaveLength(0);
  });
});
