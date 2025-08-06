"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";


export default function AuthPage() {
  const router = useRouter();
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
    <main className="min-h-screen flex items-center justify-center bg-zinc-950">
      <form onSubmit={handleAuth} className="bg-zinc-900 p-8 rounded-xl shadow-lg w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-bold text-yellow-400 mb-2 text-center">
          {view === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h2>
        <input
          type="email"
          className="w-full rounded-lg px-3 py-2 bg-zinc-800 text-white"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full rounded-lg px-3 py-2 bg-zinc-800 text-white"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && (
          <div className="text-red-500 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-500 text-sm text-center bg-green-500/10 p-4 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              ¡Revisa tu email!
            </div>
            {success}
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
          disabled={loading}
        >
          {loading ? "Procesando..." : view === "login" ? "Entrar" : "Registrarse"}
        </button>
        <div className="text-center text-zinc-400 text-sm">
          {view === "login" ? (
            <span>
              ¿No tienes cuenta?{' '}
              <button type="button" className="text-yellow-400 underline" onClick={() => setView("register")}>Regístrate</button>
            </span>
          ) : (
            <span>
              ¿Ya tienes cuenta?{' '}
              <button type="button" className="text-yellow-400 underline" onClick={() => setView("login")}>Inicia sesión</button>
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
