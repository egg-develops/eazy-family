/**
 * Single source of truth for the user's language across the voice pipeline.
 *
 * Every surface that starts a speech recognizer, formats a prompt language
 * hint, or picks a date-parsing locale MUST go through these helpers.
 * The authoritative key is `eazy-family-language` (written by Settings /
 * Onboarding / LanguageSwitcher and synced via preferencesSync) — NOT
 * `i18nextLng`, which the app never writes. Reading the wrong key is how
 * non-English users ended up with an en-US recognizer producing
 * phonetic-English garbage.
 */

const LOCALE_TO_SPEECH: Record<string, string> = {
  en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT',
  'en-US': 'en-US', 'en-GB': 'en-GB',
  'de-DE': 'de-DE', 'de-CH': 'de-CH', 'de-AT': 'de-DE',
  'fr-FR': 'fr-FR', 'fr-CH': 'fr-FR', 'fr-BE': 'fr-FR',
  'it-IT': 'it-IT', 'it-CH': 'it-IT',
  'es-ES': 'es-ES', 'es-MX': 'es-MX', 'es-US': 'es-US',
  'pt-PT': 'pt-PT', 'pt-BR': 'pt-BR',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English', de: 'German', 'de-CH': 'Swiss German',
  fr: 'French', it: 'Italian', es: 'Spanish', pt: 'Portuguese',
};

/** The stored app language code (e.g. "de", "en-GB"). Falls back to browser language, then "en". */
export function getAppLanguage(): string {
  try {
    return (
      localStorage.getItem('eazy-family-language') ||
      localStorage.getItem('i18nextLng') ||
      navigator.language ||
      'en'
    );
  } catch {
    return 'en';
  }
}

/** Base language ("de-CH" → "de") — for locale-keyed lookups like date-fns / chrono. */
export function getAppBaseLanguage(): string {
  return getAppLanguage().split('-')[0];
}

/** BCP-47 locale for speech recognizers (SFSpeechRecognizer / Android / Web Speech / Whisper hint). */
export function getSpeechLocale(): string {
  const saved = getAppLanguage();
  return LOCALE_TO_SPEECH[saved] || LOCALE_TO_SPEECH[saved.split('-')[0]] || 'en-US';
}

/** English name of the user's language — for LLM prompt language hints. */
export function getAppLanguageLabel(): string {
  const saved = getAppLanguage();
  return LANGUAGE_LABELS[saved] || LANGUAGE_LABELS[saved.split('-')[0]] || 'English';
}
