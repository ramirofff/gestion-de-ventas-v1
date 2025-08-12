
"use client";
// Types for connected users and commission details
interface ConnectedUser {
  user_id: string;
  business_name: string;
  email: string;
  stripe_account_id: string;
}

interface CommissionDetail {
  id: string;
  amount_total: number;
  commission_amount: number;
  net_amount: number;
  product_name: string;
  created_at: string;
  status: string;
  currency: string;
}
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CommissionsSummaryPage() {
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ConnectedUser | null>(null);
  const [commissions, setCommissions] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSuperuser, setIsSuperuser] = useState<boolean | null>(null);

  // Check if current user is superuser
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSuperuser(false);
        return;
      }
      const { data, error } = await supabase
        .from('superusers')
        .select('id')
        .eq('id', user.id)
        .single();
      setIsSuperuser(!!data && !error);
    })();
  }, []);

  // Fetch connected users
  useEffect(() => {
    fetch("/api/admin/connected-users")
      .then(res => res.json())
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  // Fetch commissions for selected user
  useEffect(() => {
    if (!selectedUser) return;
    setLoading(true);
    fetch(`/api/admin/commissions-by-user?user_id=${selectedUser.user_id}`)
      .then(res => res.json())
      .then(setCommissions)
      .catch(() => setCommissions([]))
      .finally(() => setLoading(false));
  }, [selectedUser]);

  // Export commissions as CSV
  const exportCSV = () => {
    if (!commissions.length) return;
    const header = 'Fecha,Producto,Monto Total,Comisión,Net Amount,Moneda,Estado\n';
    const rows = commissions.map(c =>
      `${c.created_at},${c.product_name},${c.amount_total},${c.commission_amount},${c.net_amount},${c.currency},${c.status}`
    ).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones_${selectedUser?.user_id}.csv`;
    a.click();
  };

  if (isSuperuser === null) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Verificando permisos...</div>;
  }
  if (!isSuperuser) {
    return <div className="min-h-screen flex items-center justify-center text-2xl text-red-500">Acceso denegado: solo para superusuarios</div>;
  }

  return (
    <div className={theme === 'dark' ? 'min-h-screen bg-zinc-950 text-white' : 'min-h-screen bg-white text-zinc-900'} style={{padding: 32}}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <a href="/" className="px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-900">← Volver al Home</a>
          <h1 className="text-3xl font-bold">Panel de Comisiones</h1>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-4 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
        >
          {theme === 'dark' ? '☀️ Tema Claro' : '🌙 Tema Oscuro'}
        </button>
      </div>
      <div className="flex gap-8">
        <div className="w-80">
          <h2 className="text-xl font-semibold mb-4">Usuarios conectados</h2>
          <ul className="space-y-2">
            {users.map(u => (
              <li key={u.user_id}>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg border ${selectedUser?.user_id === u.user_id ? 'bg-blue-700 text-white' : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'} transition`}
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="font-bold">{u.business_name}</div>
                  <div className="text-xs">{u.email}</div>
                  <div className="text-xs text-zinc-400">Stripe: {u.stripe_account_id}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
            <div className="flex-1">
              {selectedUser && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Comisiones de {selectedUser.business_name}</h2>
                  <button
                    onClick={exportCSV}
                    className="mb-4 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >Exportar CSV</button>
                  <button
                    onClick={() => window.location.reload()}
                    className="ml-4 px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600"
                  >Recargar</button>
                  {loading ? (
                    <div className="mt-8">Cargando...</div>
                  ) : error ? (
                    <div className="mt-8 text-red-400">Error: {error}</div>
                  ) : (
                    <table className="w-full mt-4 border-collapse">
                      <thead>
                        <tr className="bg-zinc-800">
                          <th className="p-2 border-b border-zinc-700">Fecha</th>
                          <th className="p-2 border-b border-zinc-700">Producto</th>
                          <th className="p-2 border-b border-zinc-700">Monto Total</th>
                          <th className="p-2 border-b border-zinc-700">Comisión</th>
                          <th className="p-2 border-b border-zinc-700">Net</th>
                          <th className="p-2 border-b border-zinc-700">Moneda</th>
                          <th className="p-2 border-b border-zinc-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map(c => (
                          <tr key={c.id} className="odd:bg-zinc-900 even:bg-zinc-800">
                            <td className="p-2">{new Date(c.created_at).toLocaleString()}</td>
                            <td className="p-2">{c.product_name}</td>
                            <td className="p-2">${c.amount_total.toFixed(2)}</td>
                            <td className="p-2 text-green-400">${c.commission_amount.toFixed(2)}</td>
                            <td className="p-2">${c.net_amount.toFixed(2)}</td>
                            <td className="p-2">{c.currency}</td>
                            <td className="p-2">{c.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
