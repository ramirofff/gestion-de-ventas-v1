"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import UserSettingsManager from '../lib/userSettings';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getThemeClass: (options: { dark: string; light: string }) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Obtener usuario autenticado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar tema desde Supabase cuando el usuario esté autenticado
  useEffect(() => {
    const loadTheme = async () => {
      if (currentUser && !themeLoaded) {
        const userTheme = await UserSettingsManager.getTheme(currentUser.id);
        setTheme(userTheme);
        setThemeLoaded(true);
      } else if (!currentUser) {
        // Usuario no autenticado, usar localStorage como fallback
        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('theme') as Theme;
          if (savedTheme) {
            setTheme(savedTheme);
          }
        }
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, [currentUser, themeLoaded]);

  const getThemeClass = (options: { dark: string; light: string }) => 
    theme === 'dark' ? options.dark : options.light;

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    
    if (currentUser) {
      // Usuario autenticado: guardar en Supabase
      await UserSettingsManager.setTheme(currentUser.id, newTheme);
    } else {
      // Usuario no autenticado: usar localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
      }
    }
  };

  const value = {
    theme,
    setTheme: updateTheme,
    getThemeClass
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
