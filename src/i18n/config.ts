import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import enGB from './locales/en-GB.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

function detectLng(): string {
  const stored = localStorage.getItem('eazy-family-language');
  if (stored) return stored;
  const nav = (navigator.language || '').toLowerCase();
  if (nav === 'de-ch') return 'de-CH';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('it')) return 'it';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('pt')) return 'pt';
  if (nav === 'en-gb') return 'en-GB';
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'en-GB': { translation: { ...en, ...enGB } },
      de: { translation: de },
      'de-CH': { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      es: { translation: es },
      pt: { translation: pt },
    },
    lng: detectLng(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
