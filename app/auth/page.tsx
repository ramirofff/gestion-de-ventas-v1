"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useTheme } from "../../contexts/ThemeContext";


export default function AuthPage() {
  const router = useRouter();
  const { theme, getThemeClass } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState<"login" | "register">("login");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    
    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.replace("/");
      }
    } else {
      // Registro de nuevo usuario
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setError(error.message);
      } else if (data?.user && !data?.user?.email_confirmed_at) {
        // Usuario creado exitosamente pero necesita verificar email
        setSuccess(`¡Registro exitoso! Se ha enviado un enlace de verificación a ${email}. Por favor, revisa tu correo electrónico y haz clic en el enlace para activar tu cuenta.`);
        setEmail("");
        setPassword("");
      } else if (data?.user?.email_confirmed_at) {
        // Email ya confirmado (caso raro, pero posible)
        router.replace("/");
      }
    }
    setLoading(false);
  };

  return (
    <main className={`min-h-screen flex items-center justify-center ${getThemeClass({dark: 'bg-zinc-950', light: 'bg-gray-100'})}`}>
      <div className={`p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 ${getThemeClass({dark: 'bg-zinc-900', light: 'bg-white'})}`}>
        {/* Icono y header */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${getThemeClass({dark: 'bg-blue-600', light: 'bg-blue-500'})}`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold ${getThemeClass({dark: 'text-white', light: 'text-gray-900'})}`}>
            Sistema de Pagos
          </h1>
          <p className={`text-sm ${getThemeClass({dark: 'text-gray-400', light: 'text-gray-600'})}`}>
            {view === "login" ? "Inicia sesión en tu cuenta" : "Crea tu nueva cuenta"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-700'})}`}>
              Email
            </label>
            <input
              type="email"
              className={`w-full rounded-lg px-4 py-3 border transition-colors ${getThemeClass({
                dark: 'bg-zinc-800 text-white border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                light: 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              })}`}
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-700'})}`}>
              Contraseña
            </label>
            <input
              type="password"
              className={`w-full rounded-lg px-4 py-3 border transition-colors ${getThemeClass({
                dark: 'bg-zinc-800 text-white border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                light: 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
              })}`}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className={`text-red-400 text-sm p-3 rounded-lg border ${getThemeClass({
              dark: 'bg-red-500/10 border-red-500/20',
              light: 'bg-red-50 border-red-200'
            })}`}>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className={`text-green-500 text-sm p-4 rounded-lg border ${getThemeClass({
              dark: 'bg-green-500/10 border-green-500/20',
              light: 'bg-green-50 border-green-200'
            })}`}>
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="font-medium mb-1">¡Revisa tu email!</div>
                  {success}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Procesando..." : view === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </button>

          <div className={`text-center text-sm ${getThemeClass({dark: 'text-gray-400', light: 'text-gray-600'})}`}>
            {view === "login" ? (
              <span>
                ¿No tienes cuenta?{' '}
                <button 
                  type="button" 
                  className="text-blue-500 hover:text-blue-600 underline font-medium"
                  onClick={() => setView("register")}
                >
                  Regístrate aquí
                </button>
              </span>
            ) : (
              <span>
                ¿Ya tienes cuenta?{' '}
                <button 
                  type="button" 
                  className="text-blue-500 hover:text-blue-600 underline font-medium"
                  onClick={() => setView("login")}
                >
                  Inicia sesión
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
