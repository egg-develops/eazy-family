import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Only English (the fallback) is bundled statically. The other languages are
// code-split and loaded on demand — bundling all 7 locale JSONs put ~660 KB of
// translations in the entry chunk, 6/7 of it dead weight for any given user.
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  'en-GB': () => import('./locales/en-GB.json'),
  de: () => import('./locales/de.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  es: () => import('./locales/es.json'),
  pt: () => import('./locales/pt.json'),
};

/** Bundle key for a language code: "de-CH" uses the "de" bundle. */
function bundleFor(lng: string): string {
  if (lng === 'en-GB') return 'en-GB';
  return lng.split('-')[0];
}

/** Load a language's translations if not already present. Safe to call repeatedly. */
export async function loadLocale(lng: string): Promise<void> {
  const key = bundleFor(lng);
  const loader = LOADERS[key];
  if (!loader || i18n.hasResourceBundle(key, 'translation')) return;
  try {
    const mod = await loader();
    // en-GB only carries overrides — layer it over the full en bundle.
    const data = key === 'en-GB' ? { ...en, ...mod.default } : mod.default;
    i18n.addResourceBundle(key, 'translation', data, true, true);
  } catch {
    // Chunk failed to load (offline / stale deploy) — English fallback applies.
  }
}

// Language subdirectories used for localized SEO (e.g. /de, /fr). Kept in sync
// with the locale routes in App.tsx and scripts/prerender-locales.mjs.
export const SEO_LOCALE_PREFIXES = ['de', 'fr', 'it', 'es', 'pt'] as const;

function detectLng(): string {
  // A localized marketing URL (/de, /fr/about, …) is an explicit language
  // signal — honour it above any stored preference so shared/crawled locale
  // links always render in that language.
  if (typeof window !== 'undefined') {
    const seg = window.location.pathname.split('/')[1];
    if ((SEO_LOCALE_PREFIXES as readonly string[]).includes(seg)) return seg;
  }
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

const initialLng = detectLng();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
      // Re-render when a lazily-loaded bundle is added, not only on language change.
      bindI18nStore: 'added',
    },
  });

// Load the active language's bundle (no-op for en). Any changeLanguage —
// Settings, LanguageSwitcher, prefs hydration — triggers the same load.
void loadLocale(initialLng);
i18n.on('languageChanged', (lng) => { void loadLocale(lng); });

export default i18n;
