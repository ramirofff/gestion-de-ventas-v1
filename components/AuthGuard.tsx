'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from './LoadingSpinner';


interface AuthGuardProps {
  children: React.ReactNode;
  allowedEmails?: string[];
}

export function AuthGuard({ children, allowedEmails }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    // Obtener sesión inicial con manejo de errores
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error al obtener sesión en AuthGuard:', error.message);
          // Limpiar sesión inválida
          if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
            console.log('🧹 Limpiando sesión inválida desde AuthGuard...');
            await supabase.auth.signOut();
            // Limpiar localStorage
            localStorage.removeItem('supabase.auth.token');
          }
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.warn('Error de autenticación en AuthGuard:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Escuchar cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed in AuthGuard:', event);
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
      } else {
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Registro
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'client' // Marcar como cliente
            }
          }
        });
        if (error) throw error;
        
        // Si el registro fue exitoso, mostrar mensaje
        alert('Registro exitoso! Revisa tu email para confirmar la cuenta.');
        setIsLogin(true); // Cambiar a modo login
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💳</div>
              <h1 className="text-3xl font-bold text-gray-800">
                Sistema de Pagos
              </h1>
              <p className="text-gray-600 mt-2">
                {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta de cliente'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                  </span>
                ) : (
                  isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
                )}
              </button>
            </form>

            {/* Toggle between login/register */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError('');
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {isLogin 
                  ? '¿No tienes cuenta? Regístrate aquí'
                  : '¿Ya tienes cuenta? Inicia sesión'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si hay restricción de emails y el usuario no está permitido, mostrar acceso denegado
  if (allowedEmails && allowedEmails.length > 0 && (!user?.email || !allowedEmails.includes(user.email))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Acceso denegado</h1>
          <p className="text-gray-600">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }
  // Usuario autenticado y permitido
  return <>{children}</>;
}
