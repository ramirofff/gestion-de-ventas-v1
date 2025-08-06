"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener los parámetros de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken && refreshToken) {
          // Establecer la sesión con los tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            setError('Error al confirmar la cuenta. Por favor, intenta de nuevo.');
          } else if (data?.user) {
            // Usuario confirmado exitosamente
            console.log('Usuario confirmado:', data.user);
            
            // Crear perfil por defecto si no existe
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                store_name: 'Mi Tienda',
                email: data.user.email
              });

            if (profileError) {
              console.error('Error creating profile:', profileError);
            }

            // Redirigir a la aplicación principal
            router.replace('/?verified=true');
          }
        } else if (type === 'recovery') {
          // Manejar recuperación de contraseña
          router.replace('/auth/reset-password');
        } else {
          // Parámetros inválidos o faltantes
          setError('Enlace de verificación inválido o expirado.');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('Ocurrió un error inesperado.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-yellow-400 mb-2">Verificando cuenta...</h2>
          <p className="text-zinc-400 text-sm">Por favor, espera mientras confirmamos tu email.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-500 mb-2">Error de verificación</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth')}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </main>
    );
  }

  // Este estado no debería alcanzarse normalmente
  return null;
}
