// app/commissions/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface CommissionSale {
  id: number;
  connected_account_id: number;
  stripe_payment_intent_id: string;
  customer_email: string | null;
  product_name: string;
  amount_total: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  transfer_id: string | null;
  created_at: string;
  connected_account?: {
    business_name: string;
    stripe_account_id: string;
    country: string;
    commission_rate: number;
  };
}

interface User {
  id: string;
  email: string | null | undefined;
}

export default function CommissionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [commissions, setCommissions] = useState<CommissionSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCommissions, setTotalCommissions] = useState(0);

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

  // Cargar comisiones
  useEffect(() => {
    if (user?.id) {
      loadCommissions();
    }
  }, [user]);

  const loadCommissions = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📊 Cargando comisiones para usuario:', user.id);

      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commission_sales')
        .select(`
          *,
          connected_account:connected_accounts (
            business_name,
            stripe_account_id,
            country,
            commission_rate
          )
        `)
        .eq('connected_accounts.user_id', user.id)
        .order('created_at', { ascending: false });

      if (commissionsError) {
        console.error('❌ Error cargando comisiones:', commissionsError);
        setError('Error cargando comisiones: ' + commissionsError.message);
        return;
      }

      console.log('✅ Comisiones cargadas:', commissionsData?.length || 0);
      setCommissions(commissionsData || []);

      // Calcular total de comisiones
      const total = (commissionsData || []).reduce((sum, commission) => sum + commission.commission_amount, 0);
      setTotalCommissions(total);

    } catch (err) {
      console.error('❌ Error general:', err);
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceso Requerido</h2>
          <p className="text-gray-600 mb-6">Debes iniciar sesión para ver tus comisiones</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Panel de Comisiones</h1>
              <p className="text-gray-600 mt-2">
                Gestiona y visualiza todas tus comisiones de ventas
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-500">Total de Comisiones</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCommissions)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            ← Volver a la Tienda
          </a>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando comisiones...</span>
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

        {/* Commissions Table */}
        {!loading && !error && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {commissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay comisiones</h3>
                <p className="text-gray-600 mb-4">
                  Aún no tienes ventas que generen comisiones.
                </p>
                <a
                  href="/stripe-connect-manual"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configurar Cuenta Stripe
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Venta Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Comisión
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Neto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(commission.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={commission.product_name}>
                            {commission.product_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {commission.customer_email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(commission.amount_total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(commission.commission_amount)}
                          {commission.connected_account && (
                            <div className="text-xs text-gray-500">
                              {(commission.connected_account.commission_rate * 100).toFixed(1)}%
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(commission.net_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              commission.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {commission.status === 'completed' ? 'Completada' : 'Pendiente'}
                            </span>
                            
                            {commission.connected_account?.country === 'AR' && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                Transfer Manual
                              </span>
                            )}
                            
                            {commission.transfer_id && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                Auto Transfer
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {commissions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-gray-900">
                  {commissions.length}
                </div>
                <div className="ml-2 text-sm text-gray-600">
                  Ventas Totales
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalCommissions)}
                </div>
                <div className="ml-2 text-sm text-gray-600">
                  Total Comisiones
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(commissions.reduce((sum, c) => sum + c.net_amount, 0))}
                </div>
                <div className="ml-2 text-sm text-gray-600">
                  Total Neto
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
