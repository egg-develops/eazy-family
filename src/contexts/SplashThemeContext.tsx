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
    
    // Dark Navy + Warm Coral Theme for Splash/Auth Pages
    root.style.setProperty('--background', '217 33% 18%'); // Dark Navy #0f2847
    root.style.setProperty('--foreground', '0 0% 100%'); // White text
    
    root.style.setProperty('--card', '217 33% 22%'); // Dark Blue #1a3a52
    root.style.setProperty('--card-foreground', '0 0% 100%'); // White text
    
    root.style.setProperty('--popover', '217 33% 22%');
    root.style.setProperty('--popover-foreground', '0 0% 100%');
    
    // Primary - Warm Coral for CTAs and accents
    root.style.setProperty('--primary', '11 100% 63%'); // #ff9d7d Warm Coral
    root.style.setProperty('--primary-foreground', '0 0% 100%'); // White text
    root.style.setProperty('--primary-hover', '11 100% 68%'); // Lighter coral on hover
    
    root.style.setProperty('--secondary', '0 0% 90%'); // Light gray for secondary buttons
    root.style.setProperty('--secondary-foreground', '217 33% 18%'); // Dark text
    
    root.style.setProperty('--muted', '0 0% 70%'); // Lighter gray
    root.style.setProperty('--muted-foreground', '0 0% 100%'); // White text
    
    root.style.setProperty('--accent', '11 100% 63%'); // Coral accent
    root.style.setProperty('--accent-foreground', '0 0% 100%'); // White text
    
    root.style.setProperty('--border', '217 33% 30%'); // Dark border
    root.style.setProperty('--input', '217 33% 30%'); // Dark input background
    root.style.setProperty('--ring', '11 100% 63%'); // Coral ring (focus states)
    
    // Gradients
    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, hsl(11 100% 63%), hsl(11 100% 68%))'); // Coral gradient
    root.style.setProperty('--gradient-warm', 'linear-gradient(135deg, hsl(217 33% 18%), hsl(217 33% 25%))'); // Dark navy gradient
    root.style.setProperty('--gradient-cool', 'linear-gradient(135deg, hsl(11 100% 63%), hsl(11 100% 70%))'); // Coral gradient
    
    // Sidebar colors for splash pages
    root.style.setProperty('--sidebar-background', '217 33% 18%');
    root.style.setProperty('--sidebar-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-primary', '11 100% 63%');
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-accent', '0 0% 90%');
    root.style.setProperty('--sidebar-accent-foreground', '217 33% 18%');
    root.style.setProperty('--sidebar-border', '217 33% 30%');
    root.style.setProperty('--sidebar-ring', '11 100% 63%');
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
