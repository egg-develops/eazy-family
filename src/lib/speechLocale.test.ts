import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getAppLanguage, getAppBaseLanguage, getSpeechLocale, getAppLanguageLabel } from './speechLocale';

// Node test env has no localStorage — shim one so we exercise the real logic
// rather than only the exception fallback.
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US' }, configurable: true });

beforeEach(() => store.clear());
afterAll(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe('speechLocale — single source of truth', () => {
  it('reads eazy-family-language first', () => {
    store.set('eazy-family-language', 'de');
    store.set('i18nextLng', 'fr');
    expect(getAppLanguage()).toBe('de');
    expect(getSpeechLocale()).toBe('de-DE');
    expect(getAppLanguageLabel()).toBe('German');
  });

  it('maps every app language to a speech locale', () => {
    const expected: Record<string, string> = {
      en: 'en-US', 'en-GB': 'en-GB', de: 'de-DE', 'de-CH': 'de-CH',
      fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
    };
    for (const [lang, locale] of Object.entries(expected)) {
      store.set('eazy-family-language', lang);
      expect(getSpeechLocale()).toBe(locale);
    }
  });

  it('de-CH: Swiss German label, "de" base language', () => {
    store.set('eazy-family-language', 'de-CH');
    expect(getAppLanguageLabel()).toBe('Swiss German');
    expect(getAppBaseLanguage()).toBe('de');
  });

  it('unknown/absent values fall back to en-US / English', () => {
    store.set('eazy-family-language', 'xx-YY');
    expect(getSpeechLocale()).toBe('en-US');
    expect(getAppLanguageLabel()).toBe('English');
    store.clear();
    expect(getSpeechLocale()).toBe('en-US');
  });
});
