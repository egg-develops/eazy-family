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

  const activateSplashTheme = () => {
    const root = document.documentElement;

    // Deep Purple-Black + Violet theme — aligned to the EZ heart logo palette
    // Background: deep purple-black like the logo glow bg (#0f051c)
    root.style.setProperty('--background', '270 62% 7%');
    root.style.setProperty('--foreground', '270 40% 96%'); // near-white with a lavender tint

    // Cards: slightly lighter deep purple
    root.style.setProperty('--card', '270 50% 12%');
    root.style.setProperty('--card-foreground', '270 40% 96%');

    root.style.setProperty('--popover', '270 50% 12%');
    root.style.setProperty('--popover-foreground', '270 40% 96%');

    // Primary — bright violet matching the logo letters (#9b59f6 ≈ hsl 270 88% 64%)
    root.style.setProperty('--primary', '270 88% 64%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--primary-hover', '270 88% 72%');

    // Secondary — deep purple for secondary buttons
    root.style.setProperty('--secondary', '270 50% 20%');
    root.style.setProperty('--secondary-foreground', '270 80% 90%');

    // Muted — muted lavender
    root.style.setProperty('--muted', '270 35% 20%');
    root.style.setProperty('--muted-foreground', '270 40% 72%');

    // Accent — soft lavender highlight (#c4b5fd ≈ hsl 262 85% 85%)
    root.style.setProperty('--accent', '262 80% 78%');
    root.style.setProperty('--accent-foreground', '270 62% 7%');

    root.style.setProperty('--border', '270 40% 22%');
    root.style.setProperty('--input', '270 40% 18%');
    root.style.setProperty('--ring', '270 88% 64%');

    // Gradients — violet to pink-purple shimmer
    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))');
    root.style.setProperty('--gradient-warm',    'linear-gradient(135deg, hsl(270 62% 10%), hsl(270 50% 16%))');
    root.style.setProperty('--gradient-cool',    'linear-gradient(135deg, hsl(262 80% 70%), hsl(270 88% 64%))');

    // Sidebar
    root.style.setProperty('--sidebar-background',          '270 62% 7%');
    root.style.setProperty('--sidebar-foreground',          '270 40% 96%');
    root.style.setProperty('--sidebar-primary',             '270 88% 64%');
    root.style.setProperty('--sidebar-primary-foreground',  '0 0% 100%');
    root.style.setProperty('--sidebar-accent',              '270 50% 20%');
    root.style.setProperty('--sidebar-accent-foreground',   '270 80% 90%');
    root.style.setProperty('--sidebar-border',              '270 40% 22%');
    root.style.setProperty('--sidebar-ring',                '270 88% 64%');
  };

  const deactivateSplashTheme = () => {
    // Reset to default CSS variables (will use values from index.css)
    const defaultVars = {
      '--background': '0 0% 96%',
      '--foreground': '0 0% 9%',
      '--card': '0 0% 98%',
      '--card-foreground': '0 0% 9%',
      '--popover': '0 0% 89%',
      '--popover-foreground': '0 0% 9%',
      '--primary': '161 93% 30%',
      '--primary-foreground': '151 80% 95%',
      '--primary-hover': '220 70% 45%',
      '--secondary': '0 0% 32%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 63%',
      '--muted-foreground': '0 0% 9%',
      '--accent': '166 76% 96%',
      '--accent-foreground': '173 80% 40%',
      '--border': '0 0% 83%',
      '--input': '0 0% 83%',
      '--ring': '161 93% 30%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(220 70% 50%), hsl(260 70% 60%))',
      '--gradient-warm': 'linear-gradient(135deg, hsl(45 90% 65%), hsl(35 85% 70%))',
      '--gradient-cool': 'linear-gradient(135deg, hsl(200 70% 60%), hsl(220 70% 50%))',
      '--sidebar-background': '0 0% 98%',
      '--sidebar-foreground': '0 0% 9%',
      '--sidebar-primary': '161 93% 30%',
      '--sidebar-primary-foreground': '151 80% 95%',
      '--sidebar-accent': '0 0% 32%',
      '--sidebar-accent-foreground': '0 0% 98%',
      '--sidebar-border': '0 0% 83%',
      '--sidebar-ring': '161 93% 30%',
    };

    const root = document.documentElement;
    Object.entries(defaultVars).forEach(([key, value]) => {
      root.style.removeProperty(key);
    });
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
