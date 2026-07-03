import * as chrono from 'chrono-node';
import { getAppBaseLanguage } from '@/lib/speechLocale';

/**
 * Locale-aware natural-language date parsing.
 *
 * chrono-node's default export parses ENGLISH ONLY — calling it on "morgen um
 * 15 Uhr" or "demain à 15h" silently finds nothing, so every non-English
 * fallback path lost its date. chrono ships parsers for all six app languages;
 * pick the one matching the app language and fall back to English (voice
 * transcripts occasionally mix in English date words).
 */

const PARSERS: Record<string, chrono.Chrono> = {
  en: chrono.en.casual,
  de: chrono.de.casual,
  fr: chrono.fr.casual,
  it: chrono.it.casual,
  es: chrono.es.casual,
  pt: chrono.pt.casual,
};

export function getChrono(lang?: string): chrono.Chrono {
  return PARSERS[lang ?? getAppBaseLanguage()] ?? PARSERS.en;
}

/** chrono.parse in the app's language, falling back to English when the locale parser finds nothing. */
export function parseDatesLocalized(
  text: string,
  ref?: Date,
  options?: chrono.ParsingOption,
  lang?: string,
): chrono.ParsedResult[] {
  const base = lang ?? getAppBaseLanguage();
  const primary = getChrono(base).parse(text, ref, options);
  if (primary.length || base === 'en') return primary;
  return PARSERS.en.parse(text, ref, options);
}
