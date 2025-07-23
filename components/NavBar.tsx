"use client";
import Link from 'next/link';
import { User2, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function NavBar() {
  const [user, setUser] = useState<unknown>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800 shadow-lg">
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-7 h-7 text-yellow-400" />
        <span className="text-xl font-bold text-yellow-400">Gestion de ventas v1</span>
      </div>
      <div className="flex gap-4 items-center">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-yellow-400 font-medium transition-colors">
          <ShoppingCart className="w-5 h-5" /> Página principal
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <User2 className="w-6 h-6 text-zinc-400" />
        <span className="text-zinc-300 text-sm">{typeof user === 'object' && user && 'email' in user && typeof user.email === 'string' ? user.email : 'Invitado'}</span>
      </div>
    </nav>
  );
}
