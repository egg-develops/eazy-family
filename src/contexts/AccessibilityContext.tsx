import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { cloudSet } from '@/lib/preferencesSync';

const STORAGE_KEY = 'eazy-large-tap-targets';

interface AccessibilityContextType {
  /** When true, every interactive control is enforced to a 44x44px minimum
   *  touch target app-wide (WCAG 2.5.5 AAA). Default false = compact authored
   *  sizes (still AA via per-control .tap-pad hit areas). */
  largeTapTargets: boolean;
  setLargeTapTargets: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const applyClass = (enabled: boolean) => {
  document.documentElement.classList.toggle('large-tap-targets', enabled);
};

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [largeTapTargets, setStateValue] = useState<boolean>(
    () => localStorage.getItem(STORAGE_KEY) === '1'
  );

  // Reflect the preference onto <html> so the gated CSS rule applies.
  useEffect(() => {
    applyClass(largeTapTargets);
  }, [largeTapTargets]);

  // Re-read when cloud preferences hydrate after login (cross-device sync).
  useEffect(() => {
    const handler = () => setStateValue(localStorage.getItem(STORAGE_KEY) === '1');
    window.addEventListener('eazy-prefs-loaded', handler);
    return () => window.removeEventListener('eazy-prefs-loaded', handler);
  }, []);

  const setLargeTapTargets = (enabled: boolean) => {
    setStateValue(enabled);
    cloudSet(STORAGE_KEY, enabled ? '1' : '0');
  };

  return (
    <AccessibilityContext.Provider value={{ largeTapTargets, setLargeTapTargets }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
