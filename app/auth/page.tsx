"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"login" | "register">("login");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
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
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
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
