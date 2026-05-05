import { createContext, useContext, ReactNode, useEffect } from 'react';

interface SplashThemeContextType {
  isSplashPage: boolean;
  activateSplashTheme: () => void;
  deactivateSplashTheme: () => void;
}

const SplashThemeContext = createContext<SplashThemeContextType | undefined>(undefined);

export const SplashThemeProvider = ({ children }: { children: ReactNode }) => {
  const isSplashPage = true; // This provider wraps splash pages

  useEffect(() => {
    // Apply splash theme CSS variables
    activateSplashTheme();

    return () => {
      // Cleanup when component unmounts
      deactivateSplashTheme();
    };
  }, []);

  const SPLASH_VARS = [
    '--background', '--foreground',
    '--card', '--card-foreground',
    '--popover', '--popover-foreground',
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--muted', '--muted-foreground',
    '--accent', '--accent-foreground',
    '--border', '--input', '--ring',
    '--sidebar-background', '--sidebar-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-ring',
  ] as const;

  const activateSplashTheme = () => {
    const root = document.documentElement;
    /* Onboarding/upgrade is a celebratory moment — ink bg with grape glow */
    root.style.setProperty('--background', '266 61% 11%');   /* ink #1A0B2E */
    root.style.setProperty('--foreground', '270 100% 99%');  /* paper */
    root.style.setProperty('--card', '267 60% 15%');
    root.style.setProperty('--card-foreground', '270 100% 99%');
    root.style.setProperty('--popover', '267 60% 15%');
    root.style.setProperty('--popover-foreground', '270 100% 99%');
    root.style.setProperty('--primary', '262 68% 72%');      /* #A985E8 grape on dark */
    root.style.setProperty('--primary-foreground', '266 61% 11%');
    root.style.setProperty('--secondary', '267 60% 18%');
    root.style.setProperty('--secondary-foreground', '263 67% 81%');
    root.style.setProperty('--muted', '267 60% 18%');
    root.style.setProperty('--muted-foreground', '263 67% 81%');
    root.style.setProperty('--accent', '267 60% 22%');
    root.style.setProperty('--accent-foreground', '263 67% 81%');
    root.style.setProperty('--border', '267 60% 22%');
    root.style.setProperty('--input', '267 60% 22%');
    root.style.setProperty('--ring', '262 68% 72%');
    root.style.setProperty('--sidebar-background', '267 60% 9%');
    root.style.setProperty('--sidebar-foreground', '270 100% 99%');
    root.style.setProperty('--sidebar-primary', '262 68% 72%');
    root.style.setProperty('--sidebar-primary-foreground', '266 61% 11%');
    root.style.setProperty('--sidebar-accent', '267 60% 18%');
    root.style.setProperty('--sidebar-accent-foreground', '263 67% 81%');
    root.style.setProperty('--sidebar-border', '267 60% 22%');
    root.style.setProperty('--sidebar-ring', '262 68% 72%');
  };

  const deactivateSplashTheme = () => {
    const root = document.documentElement;
    SPLASH_VARS.forEach(key => root.style.removeProperty(key));
  };

  return (
    <SplashThemeContext.Provider value={{ isSplashPage, activateSplashTheme, deactivateSplashTheme }}>
      {children}
    </SplashThemeContext.Provider>
  );
};

export const useSplashTheme = () => {
  const context = useContext(SplashThemeContext);
  if (context === undefined) {
    throw new Error('useSplashTheme must be used within a SplashThemeProvider');
  }
  return context;
};
