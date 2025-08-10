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
  // Siempre iniciar en 'dark' por defecto, salvo que el usuario haya elegido 'light' explícitamente
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') return 'light';
      // Cualquier otro caso, incluso null o 'dark', forzar 'dark'
      return 'dark';
    }
    return 'dark';
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Cargar tema desde localStorage inmediatamente en el cliente
  useEffect(() => {
    // Al montar, sincronizar localStorage y clase HTML con el tema actual
    if (typeof window !== 'undefined') {
      if (theme !== 'dark' && theme !== 'light') {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      setThemeLoaded(true);
    }
  }, []);

  // Obtener usuario autenticado con manejo de errores
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error al obtener sesión:', error.message);
          // Limpiar sesión inválida
          if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
          }
          setCurrentUser(null);
        } else {
          setCurrentUser(session?.user ?? null);
        }
      } catch (err) {
        console.warn('Error de autenticación:', err);
        setCurrentUser(null);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar tema desde Supabase cuando el usuario esté autenticado
  useEffect(() => {
    const loadTheme = async () => {
      if (currentUser && themeLoaded) {
        try {
          const userTheme = await UserSettingsManager.getTheme(currentUser.id);
          if (userTheme === 'dark' || userTheme === 'light') {
            // Si la preferencia en Supabase es distinta al estado/localStorage, forzarla
            setTheme(userTheme);
            if (typeof window !== 'undefined') localStorage.setItem('theme', userTheme);
          } else {
            setTheme('dark');
            if (typeof window !== 'undefined') localStorage.setItem('theme', 'dark');
          }
        } catch (error) {
          setTheme('dark');
          if (typeof window !== 'undefined') localStorage.setItem('theme', 'dark');
        }
      }
    };
    loadTheme();
  }, [currentUser, themeLoaded]);

  const getThemeClass = (options: { dark: string; light: string }) => 
    theme === 'dark' ? options.dark : options.light;

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    
    // Aplicar clase al HTML inmediatamente
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', newTheme);
    }
    
    if (currentUser) {
      // Usuario autenticado: guardar en Supabase
      try {
        await UserSettingsManager.setTheme(currentUser.id, newTheme);
      } catch (error) {
        console.warn('No se pudo guardar el tema del usuario:', error);
      }
    }
  };

  // Aplicar clase dark al HTML cuando cambie el tema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

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
