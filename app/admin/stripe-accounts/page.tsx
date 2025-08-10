// app/admin/stripe-accounts/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface ConnectedAccount {
  id: string;
  stripe_account_id: string;
  email: string;
  business_name: string;
  country: string;
  commission_rate: number;
  status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface User {
  id: string;
  email: string | null | undefined;
}

export default function StripeAccountsAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar usuario autenticado
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          email: session.user.email 
        });
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          email: session.user.email 
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar cuentas conectadas
  useEffect(() => {
    if (user?.id) {
      loadAccounts();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Cargando cuentas conectadas para usuario:', user.id);

      const { data: accountsData, error: accountsError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('❌ Error cargando cuentas:', accountsError);
        setError('Error cargando cuentas: ' + accountsError.message);
        return;
      }

      console.log('✅ Cuentas cargadas:', accountsData?.length || 0);
      setAccounts(accountsData || []);

    } catch (err) {
      console.error('❌ Error general:', err);
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionRate = async (accountId: string, newRate: number) => {
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .update({ commission_rate: newRate, updated_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error actualizando tasa:', error);
        alert('Error actualizando tasa de comisión');
        return;
      }

      // Actualizar estado local
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, commission_rate: newRate } : acc
      ));

      console.log('✅ Tasa de comisión actualizada');

    } catch (err) {
      console.error('Error:', err);
      alert('Error actualizando tasa de comisión');
    }
  };

  const updateAccountStatus = async (accountId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('connected_accounts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error actualizando estado:', error);
        alert('Error actualizando estado de cuenta');
        return;
      }

      // Actualizar estado local
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId ? { ...acc, status: newStatus } : acc
      ));

      console.log('✅ Estado de cuenta actualizado');

    } catch (err) {
      console.error('Error:', err);
      alert('Error actualizando estado de cuenta');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      restricted: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    return styles[status as keyof typeof styles] || styles.inactive;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para administrar cuentas</p>
          <a
            href="/auth"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Administrar Cuentas Stripe</h1>
              <p className="text-gray-600 mt-2">
                Gestiona todas las cuentas conectadas y sus configuraciones
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Cuentas</p>
              <p className="text-2xl font-bold text-blue-600">
                {accounts.length}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-6 flex space-x-4">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            ← Volver a la Tienda
          </a>
          <a
            href="/commissions"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💰 Ver Comisiones
          </a>
          <a
            href="/stripe-connect-manual"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            ➕ Agregar Cuenta
          </a>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando cuentas...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Table */}
        {!loading && !error && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cuentas conectadas</h3>
                <p className="text-gray-600 mb-4">
                  Aún no tienes cuentas Stripe conectadas.
                </p>
                <a
                  href="/stripe-connect-manual"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Agregar Primera Cuenta
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Negocio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stripe ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        País
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comisión
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Configuración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.business_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {account.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {account.stripe_account_id.startsWith('ar_virtual') ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Virtual AR
                            </span>
                          ) : (
                            account.stripe_account_id
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center">
                            {account.country === 'AR' ? '🇦🇷' : '🌍'} {account.country}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.001"
                            value={account.commission_rate}
                            onChange={(e) => updateCommissionRate(account.id, parseFloat(e.target.value))}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="ml-1 text-sm text-gray-500">
                            ({(account.commission_rate * 100).toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={account.status}
                            onChange={(e) => updateAccountStatus(account.id, e.target.value)}
                            className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${getStatusBadge(account.status)}`}
                          >
                            <option value="active">Activa</option>
                            <option value="pending">Pendiente</option>
                            <option value="restricted">Restringida</option>
                            <option value="inactive">Inactiva</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col space-y-1">
                            {account.details_submitted && (
                              <span className="inline-flex px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                                ✓ Detalles
                              </span>
                            )}
                            {account.charges_enabled && (
                              <span className="inline-flex px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                                ✓ Charges
                              </span>
                            )}
                            {account.payouts_enabled && (
                              <span className="inline-flex px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                                ✓ Payouts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(account.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {accounts.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {accounts.filter(acc => acc.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Cuentas Activas</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {accounts.filter(acc => acc.country === 'AR').length}
                </div>
                <div className="text-sm text-gray-600">Cuentas Argentina</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {((accounts.reduce((sum, acc) => sum + acc.commission_rate, 0) / accounts.length) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Comisión Promedio</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
