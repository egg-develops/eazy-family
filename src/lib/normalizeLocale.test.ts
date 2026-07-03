import { describe, it, expect } from 'vitest';
import { normalizeCHDE, type DbDialectRule } from './normalizeLocale';

describe('normalizeCHDE — Swiss German → Standard German', () => {
  it('weekdays', () => {
    expect(normalizeCHDE('Zahnarzt am Zischtig')).toContain('Dienstag');
    expect(normalizeCHDE('Training am Samschtig')).toContain('Samstag');
  });

  it('temporal words', () => {
    expect(normalizeCHDE('morn go poschte')).toBe('morgen einkaufen');
    expect(normalizeCHDE('hüt Znacht choche')).toContain('heute');
    expect(normalizeCHDE('hüt Znacht choche')).toContain('Abendessen');
  });

  it('meals and shopping verbs', () => {
    expect(normalizeCHDE('zmittag mit de Grosi')).toContain('Mittagessen');
    expect(normalizeCHDE('poschte gah')).toContain('einkaufen');
  });

  it('list scope markers map to Standard German for isPersonalScope', () => {
    expect(normalizeCHDE('Milch uf mini Liste')).toContain('meine Liste');
    expect(normalizeCHDE('Brot uf üsi Liste')).toContain('unsere Liste');
  });

  it('leaves Standard German untouched', () => {
    expect(normalizeCHDE('Zahnarzt morgen um 15 Uhr')).toBe('Zahnarzt morgen um 15 Uhr');
  });

  it('applies db rules on top, non-regex word-bounded', () => {
    const rules: DbDialectRule[] = [
      { locale: 'de-CH', pattern: 'gwand', replacement: 'Kleidung', is_regex: false, flags: '' },
      { locale: 'fr-CH', pattern: 'ignored', replacement: 'x', is_regex: false, flags: '' },
    ];
    expect(normalizeCHDE('s gwand wäsche', rules)).toContain('Kleidung');
    expect(normalizeCHDE('ignored bleibt', rules)).toContain('ignored');
  });

  it('skips malformed regex rules without throwing', () => {
    const rules: DbDialectRule[] = [
      { locale: 'de-CH', pattern: '(unclosed', replacement: 'x', is_regex: true, flags: 'gi' },
    ];
    expect(() => normalizeCHDE('morn', rules)).not.toThrow();
  });
});
