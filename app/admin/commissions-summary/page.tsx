

"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Types for connected users and commission details
interface ConnectedUser {
  id: string; // uuid de connected_accounts
  user_id: string;
  business_name: string;
  email: string;
  stripe_account_id: string;
  commission_rate?: number | string | null;
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

export default function CommissionsSummaryPage() {
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ConnectedUser | null>(null);
  const [commissions, setCommissions] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSuperuser, setIsSuperuser] = useState<boolean | null>(null);
  // Estado para edición de comisión
  const [editCommission, setEditCommission] = useState(false);
  const [commissionInput, setCommissionInput] = useState('');

  // Actualizar input cuando cambia el usuario seleccionado
  // Utilidad para parsear commission_rate a número seguro
  function parseCommissionRate(val: number | string | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (typeof val === 'string') {
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    }
    return null;
  }

  useEffect(() => {
    const rate = parseCommissionRate(selectedUser?.commission_rate);
    setCommissionInput(rate !== null ? (rate * 100).toString() : '');
    setEditCommission(false);
  }, [selectedUser?.id, selectedUser?.commission_rate]);

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

  // Obtener el commission_rate cuando se selecciona un usuario
  useEffect(() => {
    if (!selectedUser) return;
    (async () => {
      const { data, error } = await supabase
        .from('connected_accounts')
        .select('commission_rate')
        .eq('id', selectedUser.id)
        .single();
      if (!error && data) {
        setSelectedUser({ ...selectedUser, commission_rate: data.commission_rate });
      }
    })();
  }, [selectedUser?.id]);

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
    <div className={theme === 'dark' ? 'min-h-screen bg-zinc-950 text-white' : 'min-h-screen bg-white text-zinc-900'} style={{ padding: 8 }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <a href="/" className="px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-900">← Volver al Home</a>
          <h1 className="text-2xl sm:text-3xl font-bold">Panel de Comisiones</h1>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-800 border border-zinc-900"
          >Recargar</button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 rounded bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
          >
            {theme === 'dark' ? '☀️ Tema Claro' : '🌙 Tema Oscuro'}
          </button>
        </div>
      </div>
      {/* Responsive: usuarios conectados arriba en mobile, a la izquierda en desktop */}
      <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[70vh] overflow-y-auto">
        <div className="w-full lg:w-80 mb-4 lg:mb-0 flex-shrink-0">
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
        <div className="flex-1 min-w-0">
          {selectedUser && (
            <div className="mb-6">
              {/* Mostrar y editar comisión actual */}
              <div className="mb-4 p-4 rounded flex flex-col gap-2 bg-zinc-900 text-blue-100 border border-zinc-700 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
                  <span className="font-semibold">Comisión actual:</span>
                  {!editCommission ? (
                    <div className="flex items-center gap-2 w-full max-w-xs">
                      <span className="text-lg font-mono px-3 py-1 rounded bg-zinc-800 border border-zinc-700">
                        {(() => {
                          const rate = parseCommissionRate(selectedUser.commission_rate);
                          if (rate !== null) {
                            return (rate * 100).toFixed(2);
                          }
                          return '—';
                        })()}
                      </span>
                      <span className="text-base">%</span>
                      <button
                        className="ml-2 px-3 py-1 rounded bg-blue-700 text-white hover:bg-blue-800 border border-blue-900 text-sm transition w-full sm:w-auto"
                        onClick={() => setEditCommission(true)}
                      >Cambiar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full max-w-xs">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={commissionInput}
                        onChange={e => setCommissionInput(e.target.value)}
                        className="w-24 px-2 py-1 rounded border border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 dark:bg-zinc-900 dark:text-blue-200 dark:border-blue-700 dark:focus:border-blue-400 dark:focus:ring-blue-900 transition"
                      />
                      <span className="text-base">%</span>
                      <button
                        className="ml-2 px-3 py-1 rounded bg-green-700 text-white hover:bg-green-800 border border-green-900 text-sm transition w-full sm:w-auto"
                        onClick={async () => {
                          const value = Number(commissionInput);
                          if (isNaN(value) || value < 0 || value > 100) {
                            alert('Por favor ingresa un porcentaje válido.');
                            return;
                          }
                          // Guardar como decimal (por ejemplo, 5% => 0.05)
                          const decimalValue = value / 100;
                          const { error } = await supabase
                            .from('connected_accounts')
                            .update({ commission_rate: decimalValue })
                            .eq('id', selectedUser.id);
                          if (error) {
                            alert('Error al actualizar comisión: ' + error.message);
                            return;
                          }
                          // Refrescar usuario desde la base para evitar desincronización y parsear correctamente
                          const { data: refreshed, error: err2 } = await supabase
                            .from('connected_accounts')
                            .select('commission_rate')
                            .eq('id', selectedUser.id)
                            .single();
                          setSelectedUser({ ...selectedUser, commission_rate: refreshed?.commission_rate ?? decimalValue });
                          setEditCommission(false);
                        }}
                      >Guardar</button>
                      <button
                        className="ml-2 px-3 py-1 rounded bg-zinc-700 text-white hover:bg-zinc-800 border border-zinc-900 text-sm transition w-full sm:w-auto"
                        onClick={() => setEditCommission(false)}
                      >Cancelar</button>
                    </div>
                  )}
                </div>
              </div>
              {/* Resumen de totales */}
              {commissions.length > 0 && (
                <div className="mb-4 p-4 rounded bg-zinc-800 text-white flex flex-col gap-2">
                  <div><b>Total ventas:</b> ${commissions.reduce((acc, c) => acc + (c.amount_total || 0), 0).toFixed(2)}</div>
                  <div><b>Total comisión generada:</b> ${commissions.reduce((acc, c) => acc + (c.commission_amount || 0), 0).toFixed(2)}</div>
                </div>
              )}
              {/* Forzar renderizado de la tabla aunque commissions esté vacío */}
              <h2 className="text-2xl font-bold mb-2">Comisiones de {selectedUser.business_name}</h2>
              <div className="w-full overflow-x-auto overflow-y-auto rounded border bg-white shadow" style={{ minHeight: 0, maxHeight: '60dvh', WebkitOverflowScrolling: 'touch' }}>
                <table className="min-w-[600px] w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border-b">Producto</th>
                      <th className="p-2 border-b">Fecha</th>
                      <th className="p-2 border-b">Monto Total</th>
                      <th className="p-2 border-b">Comisión</th>
                      <th className="p-2 border-b">Neto</th>
                      <th className="p-2 border-b">Moneda</th>
                      <th className="p-2 border-b">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr><td colSpan={7} className="text-center p-4 text-zinc-400">No hay comisiones para este usuario.</td></tr>
                    ) : (
                      commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="p-2 border-b">{c.product_name}</td>
                          <td className="p-2 border-b">{new Date(c.created_at).toLocaleString()}</td>
                          <td className="p-2 border-b text-right">${c.amount_total.toFixed(2)}</td>
                          <td className="p-2 border-b text-right">${c.commission_amount.toFixed(2)}</td>
                          <td className="p-2 border-b text-right">${c.net_amount.toFixed(2)}</td>
                          <td className="p-2 border-b text-center">{c.currency}</td>
                          <td className="p-2 border-b text-center">{c.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
