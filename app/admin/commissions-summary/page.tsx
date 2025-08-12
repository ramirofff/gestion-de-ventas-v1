
"use client";
// Types for connected users and commission details
interface ConnectedUser {
  id: string; // uuid de connected_accounts
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
      .then((data) => {
        // Asegurarse de que cada usuario tenga el campo id
        setUsers(data.filter((u: any) => u.id));
      })
      .catch(() => setUsers([]));
  }, []);

  // Fetch commissions for selected user
  useEffect(() => {
    if (!selectedUser) return;
    setLoading(true);
    (async () => {
      console.log('[COMISIONES] Usuario seleccionado:', selectedUser);
      const { data, error } = await supabase
        .from('commission_sales')
        .select('id, amount_total, commission_amount, net_amount, product_name, created_at, status, currency')
        .eq('connected_account_id', selectedUser.id)
        .order('created_at', { ascending: false });
      console.log('[COMISIONES] Resultado consulta:', { data, error });
      if (error) {
        setError(error.message);
        setCommissions([]);
      } else {
        // Castear los campos numéricos
        const fixed = (data || []).map((c: any) => ({
          ...c,
          amount_total: c.amount_total !== undefined ? Number(c.amount_total) : 0,
          commission_amount: c.commission_amount !== undefined ? Number(c.commission_amount) : 0,
          net_amount: c.net_amount !== undefined ? Number(c.net_amount) : 0,
        }));
        console.log('[COMISIONES] Datos casteados:', fixed);
        setCommissions(fixed);
      }
      setLoading(false);
    })();
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
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-800 border border-zinc-900"
          >Recargar</button>
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
              <li key={u.id}>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg border ${selectedUser?.id === u.id ? 'bg-blue-700 text-white' : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'} transition`}
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
                  {/* Resumen de totales */}
                  {commissions.length > 0 && (
                    <div className="mb-4 p-4 rounded bg-zinc-800 text-white flex flex-col gap-2">
                      <div><b>Total ventas:</b> ${commissions.reduce((acc, c) => acc + (c.amount_total || 0), 0).toFixed(2)}</div>
                      <div><b>Total comisión generada:</b> ${commissions.reduce((acc, c) => acc + (c.commission_amount || 0), 0).toFixed(2)}</div>
                    </div>
                  )}
                  {/* Forzar renderizado de la tabla aunque commissions esté vacío */}
                  <h2 className="text-2xl font-bold mb-2">Comisiones de {selectedUser.business_name}</h2>
                  <button
                    onClick={exportCSV}
                    className="mb-4 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >Exportar CSV</button>
                  {/* Botón para limpiar registros facturados */}
                  <button
                    onClick={async () => {
                      if (!window.confirm('¿Seguro que quieres eliminar los registros marcados como "facturado" para este usuario?')) return;
                      const { error } = await supabase
                        .from('commission_sales')
                        .delete()
                        .eq('connected_account_id', selectedUser.id)
                        .eq('status', 'facturado');
                      if (error) {
                        alert('Error al eliminar registros: ' + error.message);
                      } else {
                        alert('Registros facturados eliminados.');
                        // Refrescar comisiones
                        const { data } = await supabase
                          .from('commission_sales')
                          .select('id, amount_total, commission_amount, net_amount, product_name, created_at, status, currency')
                          .eq('connected_account_id', selectedUser.id)
                          .order('created_at', { ascending: false });
                        const fixed = (data || []).map((c: any) => ({
                          ...c,
                          amount_total: c.amount_total !== undefined ? Number(c.amount_total) : 0,
                          commission_amount: c.commission_amount !== undefined ? Number(c.commission_amount) : 0,
                          net_amount: c.net_amount !== undefined ? Number(c.net_amount) : 0,
                        }));
                        setCommissions(fixed);
                      }
                    }}
                    className="mb-4 ml-2 px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                  >Limpiar registros facturados</button>
                  {loading ? (
                    <div className="mt-8">Cargando...</div>
                  ) : error ? (
                    <div className="mt-8 text-red-400">Error: {error}</div>
                  ) : (
                    <table className="w-full mt-4 border-collapse">
                      <thead>
                        <tr className={theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'}>
                          <th className="p-2 border-b text-left align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Fecha</th>
                          <th className="p-2 border-b text-left align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Producto</th>
                          <th className="p-2 border-b text-right align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Monto Total</th>
                          <th className="p-2 border-b text-right align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Comisión</th>
                          <th className="p-2 border-b text-right align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Net</th>
                          <th className="p-2 border-b text-center align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Moneda</th>
                          <th className="p-2 border-b text-center align-middle font-semibold text-sm border-zinc-700 dark:border-zinc-700">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.filter(c => c.status !== 'pending').length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-2 text-center text-yellow-500">No hay comisiones registradas para este usuario.</td>
                          </tr>
                        ) : (
                          commissions.filter(c => c.status !== 'pending').map(c => (
                            <tr key={c.id} className={theme === 'dark' ? 'odd:bg-zinc-900 even:bg-zinc-800' : 'odd:bg-white even:bg-gray-100'}>
                              <td className="p-2 text-left align-middle">{new Date(c.created_at).toLocaleString()}</td>
                              <td className="p-2 text-left align-middle">{c.product_name}</td>
                              <td className="p-2 text-right align-middle">${Number(c.amount_total).toFixed(2)}</td>
                              <td className="p-2 text-right align-middle text-green-600 dark:text-green-400">${Number(c.commission_amount).toFixed(2)}</td>
                              <td className="p-2 text-right align-middle">${Number(c.net_amount).toFixed(2)}</td>
                              <td className="p-2 text-center align-middle">{c.currency}</td>
                              <td className="p-2 text-center align-middle">{c.status}</td>
                            </tr>
                          ))
                        )}
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
