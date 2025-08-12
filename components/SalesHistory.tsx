"use client";
import type { Sale, SaleProduct } from '../types/sale';
import { useEffect, useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import UserSettingsManager from '../lib/userSettings';

interface Props {
  userId: string | undefined;
  getThemeClass: (opts: { dark: string; light: string }) => string;
  limit?: number;
  refreshTrigger?: number; // Nuevo prop para disparar actualizaciones
}

export function SalesHistory({ userId, getThemeClass, limit, refreshTrigger }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    // Usar fecha local en formato YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [showTicket, setShowTicket] = useState<Sale | null>(null);
  const [businessName, setBusinessName] = useState('Mi Negocio');

  const fetchSales = async () => {
    console.log('🔍 fetchSales - Iniciando carga de ventas...');
    console.log('🔍 fetchSales - userId:', userId);
    
    setLoading(true);
    try {
      let allSales: Sale[] = [];
      
      // PASO 1: CARGAR DESDE SUPABASE (FUENTE PRINCIPAL)
      if (userId) {
        try {
          console.log('�️ Cargando ventas desde Supabase (fuente principal)...');
          
          // Cargar nombre del negocio
          const settings = await UserSettingsManager.getUserSettings(userId);
          if (settings?.business_name) {
            setBusinessName(settings.business_name);
          }

          const { data, error } = await supabase
            .from('sales')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Error cargando desde Supabase:', error);
            throw error;
          } else if (data) {
            console.log('✅ Ventas encontradas en Supabase:', data.length);
            
            // Mapear las ventas de Supabase al formato correcto
            allSales = data.map((sale: any) => ({
              id: sale.id,
              user_id: sale.user_id,
              total: Number(sale.total) || 0,
              created_at: sale.created_at,
              ticket_id: sale.ticket_id,
              products: sale.products || [],
              subtotal: Number(sale.subtotal) || 0,
              discount_amount: Number(sale.discount_amount) || 0,
              payment_method: sale.payment_method || '',
              payment_status: sale.payment_status || '',
              status: sale.status || '',
              stripe_payment_intent_id: sale.stripe_payment_intent_id,
              updated_at: sale.updated_at,
              metadata: sale.metadata
            }));
          }
        } catch (supabaseError) {
          console.error('❌ Error con Supabase:', supabaseError);
          // Fallback a localStorage si Supabase falla
          console.log('🔄 Fallback: Intentando cargar desde localStorage...');
        }
      }
      
      // PASO 2: CARGAR TAMBIÉN DESDE LOCALSTORAGE Y COMBINAR (EVITANDO DUPLICADOS)
      console.log('💾 Cargando también desde localStorage para combinar...');
      const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
      console.log('💾 Ventas encontradas en localStorage:', localSales.length);
      
      // COMBINAR VENTAS Y ELIMINAR DUPLICADOS DE AMBAS FUENTES
      const combinedSales: Sale[] = [...allSales]; // Comenzar con las ventas de Supabase
      const seenIds = new Set<string>();
      const seenPaymentIntents = new Set<string>();
      const seenTicketIds = new Set<string>();
      
      // Primero, marcar todos los IDs que ya tenemos de Supabase
      allSales.forEach(sale => {
        if (sale.id) seenIds.add(sale.id.toString());
        if (sale.stripe_payment_intent_id) seenPaymentIntents.add(sale.stripe_payment_intent_id);
        if (sale.ticket_id) seenTicketIds.add(sale.ticket_id);
      });
      
      // Luego, agregar las ventas de localStorage que NO estén duplicadas
      localSales.forEach((localSale: any) => {
        const saleId = localSale.id?.toString();
        const paymentIntentId = localSale.stripe_payment_intent_id;
        const ticketId = localSale.ticket_id;
        
        // Verificar si es duplicado
        const isDuplicate = 
          (saleId && seenIds.has(saleId)) ||
          (paymentIntentId && seenPaymentIntents.has(paymentIntentId)) ||
          (ticketId && seenTicketIds.has(ticketId));
        
        if (!isDuplicate) {
          // Agregar la venta local que no es duplicada
          const formattedSale: Sale = {
            id: localSale.id || localSale.ticket_id || `local-${Date.now()}-${Math.random()}`,
            ticket_id: localSale.ticket_id || localSale.id,
            created_at: localSale.created_at || localSale.date || new Date().toISOString(),
            products: localSale.products || [],
            total: Number(localSale.total) || 0,
            subtotal: Number(localSale.subtotal) || Number(localSale.total) || 0,
            payment_method: localSale.payment_method || 'stripe',
            payment_status: localSale.payment_status || 'completed',
            status: localSale.status || 'completed',
            user_id: localSale.user_id || userId || 'local-user',
            stripe_payment_intent_id: localSale.stripe_payment_intent_id,
            metadata: localSale.metadata
          };
          
          combinedSales.push(formattedSale);
          
          // Marcar IDs como vistos
          if (saleId) seenIds.add(saleId);
          if (paymentIntentId) seenPaymentIntents.add(paymentIntentId);
          if (ticketId) seenTicketIds.add(ticketId);
          
          console.log('➕ Agregando venta de localStorage:', saleId || ticketId);
        } else {
          console.log('🗑️ Eliminando duplicado de localStorage:', saleId || ticketId);
        }
      });
      
      // Ordenar por fecha más reciente
      combinedSales.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      
      allSales = combinedSales;
      console.log('✅ Total de ventas combinadas (sin duplicados):', allSales.length);
      
      setSales(allSales);
      console.log('✅ Total de ventas cargadas:', allSales.length);
      
      // PASO 3: CALCULAR TOTALES CON MEJOR LÓGICA
      console.log('📊 Calculando totales con', allSales.length, 'ventas');
      
      // PASO 3: CALCULAR TOTALES CON MEJOR LÓGICA
      console.log('📊 Calculando totales con', allSales.length, 'ventas');
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      const todaySales = allSales.filter(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= todayStart && saleDate <= todayEnd;
      });
      
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      
      const monthSales = allSales.filter(sale => {
        if (!sale.created_at) return false;
        const saleDate = new Date(sale.created_at);
        return saleDate >= thisMonth;
      });
      
      const todayAmount = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const monthAmount = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      setTodayTotal(todayAmount);
      setMonthTotal(monthAmount);
      
      console.log('📊 Totales calculados:');
      console.log('  - Ventas de hoy:', todaySales.length, '= $', todayAmount);
      console.log('  - Ventas del mes:', monthSales.length, '= $', monthAmount);
      
    } catch (error) {
      console.error('❌ Error en fetchSales:', error);
      setSales([]);
      setTodayTotal(0);
      setMonthTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [userId, refreshTrigger]); // Incluir refreshTrigger como dependencia

  // Escuchar eventos personalizados para refrescar
  useEffect(() => {
    const handleSalesUpdate = () => {
      console.log('📡 Evento sales-updated recibido, refrescando...');
      fetchSales();
    };
    
    window.addEventListener('sales-updated', handleSalesUpdate);
    return () => {
      window.removeEventListener('sales-updated', handleSalesUpdate);
    };
  }, [fetchSales]);

  // Filtrar ventas por fecha seleccionada
  let filteredSales = sales.filter(sale => {
    const d = sale.created_at ? new Date(sale.created_at) : new Date();
    // Convertir a fecha local en formato YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    return localDateString === selectedDate;
  });
  if (limit && filteredSales.length > limit) {
    filteredSales = filteredSales.slice(0, limit);
  }

  return (
    <div className={getThemeClass({dark:'bg-zinc-900',light:'bg-yellow-50'}) + " max-w-6xl mx-auto mt-10 rounded-2xl p-8 border " + getThemeClass({dark:'border-zinc-800',light:'border-yellow-200'}) + " shadow-2xl transition-colors"}>
      {/* Header mejorado */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-3">
            <ListOrdered className="w-8 h-8" /> 
            Historial de Ventas
          </h2>
          <p className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " text-sm mt-1"}>
            Gestión completa de transacciones y reportes
          </p>
        </div>
        
        {/* Selector de fecha más prominente */}
        <div className="flex items-center gap-3">
          <label className={getThemeClass({dark:'text-zinc-300',light:'text-yellow-800'}) + " text-sm font-medium"}>
            Fecha:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className={"rounded-lg px-4 py-2 border-2 transition-all focus:ring-2 focus:ring-blue-500 " + getThemeClass({dark:'bg-zinc-800 text-white border-zinc-700 focus:border-blue-500',light:'bg-white text-yellow-900 border-yellow-300 focus:border-blue-500'})}
          />
        </div>
      </div>

      {/* Métricas mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={getThemeClass({dark:'bg-zinc-800 border-zinc-700',light:'bg-yellow-100 border-yellow-300'}) + " rounded-xl p-6 border-2 text-center transition-all hover:scale-105"}>
          <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " text-sm font-medium uppercase tracking-wide mb-2"}>
            Ventas de Hoy
          </div>
          <div className="text-3xl font-bold text-green-500 mb-1">
            ${todayTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
            {filteredSales.length} transacciones
          </div>
        </div>
        
        <div className={getThemeClass({dark:'bg-zinc-800 border-zinc-700',light:'bg-yellow-100 border-yellow-300'}) + " rounded-xl p-6 border-2 text-center transition-all hover:scale-105"}>
          <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " text-sm font-medium uppercase tracking-wide mb-2"}>
            Ventas del Mes
          </div>
          <div className="text-3xl font-bold text-blue-500 mb-1">
            ${monthTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
            Total acumulado
          </div>
        </div>
        
        <div className={getThemeClass({dark:'bg-zinc-800 border-zinc-700',light:'bg-yellow-100 border-yellow-300'}) + " rounded-xl p-6 border-2 text-center transition-all hover:scale-105"}>
          <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " text-sm font-medium uppercase tracking-wide mb-2"}>
            Promedio por Venta
          </div>
          <div className="text-3xl font-bold text-purple-500 mb-1">
            ${filteredSales.length > 0 ? (todayTotal / filteredSales.length).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
            Ticket promedio
          </div>
        </div>
      </div>

      {/* Tabla mejorada */}
      <div className="overflow-x-auto rounded-xl shadow-lg">
        {loading ? (
          <div className={getThemeClass({dark:'bg-zinc-800',light:'bg-yellow-100'}) + " rounded-xl p-12 text-center"}>
            <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-500 rounded-full mb-4"></div>
            <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " font-medium"}>
              Cargando historial de ventas...
            </div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className={getThemeClass({dark:'bg-zinc-800',light:'bg-yellow-100'}) + " rounded-xl p-12 text-center"}>
            <div className="text-6xl mb-4">📊</div>
            <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'}) + " text-lg font-medium mb-2"}>
              No hay ventas para esta fecha
            </div>
            <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-sm"}>
              Selecciona otra fecha o realiza una nueva venta
            </div>
          </div>
        ) : (
          <table className={"min-w-full rounded-xl overflow-hidden transition-colors " + getThemeClass({dark:'bg-zinc-800',light:'bg-white'})}>
            <thead className={getThemeClass({dark:'bg-zinc-700',light:'bg-yellow-200'})}>
              <tr>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Ticket</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Hora</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Productos</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Total</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Método</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-left text-sm font-bold uppercase tracking-wider"}>Estado</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-6 py-4 text-center text-sm font-bold uppercase tracking-wider"}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale, index) => (
                <tr key={sale.id || index} className={getThemeClass({dark:'hover:bg-zinc-750 border-zinc-700',light:'hover:bg-yellow-50 border-yellow-200'}) + " transition-colors border-b"}>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-6 py-4"}>
                    <div className="font-mono font-bold text-sm">{sale.ticket_id}</div>
                    <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
                      ID: {sale.id?.toString().slice(0, 8)}...
                    </div>
                  </td>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-6 py-4"}>
                    <div className="font-medium">
                      {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                    <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
                      {sale.created_at ? new Date(sale.created_at).toLocaleDateString('es-AR') : ''}
                    </div>
                  </td>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-6 py-4"}>
                    <div className="font-semibold">
                      {(sale.products || []).length} items
                    </div>
                    <div className={getThemeClass({dark:'text-zinc-500',light:'text-yellow-600'}) + " text-xs"}>
                      {(sale.products || []).slice(0, 2).map((item: any, i: number) => item.name || 'Producto').join(', ')}
                      {(sale.products || []).length > 2 && '...'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xl font-bold text-green-500">
                      ${(sale.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      sale.payment_method === 'stripe' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.payment_method === 'stripe' ? '💳 Stripe' : sale.payment_method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      sale.payment_status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.payment_status === 'completed' ? '✅ Completado' : sale.payment_status || 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex gap-2 justify-center">
                      {/* Mostrar botón de Stripe si tiene payment_intent_id */}
                      {sale.stripe_payment_intent_id ? (
                        <button
                          onClick={async () => {
                            const paymentIntentId = sale.stripe_payment_intent_id;
                            console.log('🔍 Buscando recibo para sale:', sale.id, 'paymentIntentId:', paymentIntentId);
                            
                            try {
                              console.log('🧾 Obteniendo recibo oficial de Stripe...');
                              const response = await fetch('/api/stripe/receipt', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  payment_intent_id: paymentIntentId
                                })
                              });
                              
                              const data = await response.json();
                              console.log('🧾 Respuesta de API:', data);
                              
                              if (data.receipt_url) {
                                window.open(data.receipt_url, '_blank');
                              } else {
                                alert(`⚠️ Recibo no disponible\n\nInformación del pago:\nID Stripe: ${paymentIntentId}\nTotal: $${(sale.total || 0).toFixed(2)}\nFecha: ${sale.created_at ? new Date(sale.created_at).toLocaleString() : 'N/A'}\n\nContacta a soporte con este ID si necesitas el recibo.`);
                              }
                            } catch (error) {
                              console.error('❌ Error obteniendo recibo:', error);
                              alert(`❌ Error obteniendo recibo\n\nID del pago: ${paymentIntentId}\nTotal: $${(sale.total || 0).toFixed(2)}\n\nPor favor intenta de nuevo o contacta a soporte.`);
                            }
                          }}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                          title="Ver recibo oficial de Stripe"
                        >
                          🧾 Ver Recibo
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowTicket(sale)}
                          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 shadow-lg"
                        >
                          📄 Ver Ticket
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal del ticket profesional - estilo post-venta */}
      {showTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative transform transition-all max-h-[90vh] overflow-y-auto">
            {/* Botón cerrar */}
            <button
              onClick={() => setShowTicket(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold z-10 transition-colors"
            >
              ×
            </button>
            
            {/* Header profesional */}
            <div className="text-center p-6 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="text-white mb-4">
                <div className="text-4xl mb-2">🎉</div>
                <h2 className="text-2xl font-bold">¡Venta Realizada!</h2>
                <p className="text-blue-100 text-sm mt-2">Comprobante de compra</p>
              </div>
              <div className="inline-block bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium">
                ✅ Pago completado
              </div>
            </div>

            {/* Comprobante de Compra */}
            <div className="bg-blue-600 text-white p-4 text-center">
              <h3 className="text-xl font-bold">📄 Comprobante de Compra</h3>
              <p className="text-blue-200 text-sm mt-1">
                ID: {showTicket.ticket_id?.slice(-8) || 'N/A'}
              </p>
            </div>
            
            <div className="p-6">
              {/* Detalles de la compra */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    📄 Detalles de la Compra
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fecha: {showTicket.created_at ? new Date(showTicket.created_at).toLocaleString('es-AR') : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Negocio: {businessName}
                  </p>
                </div>
                
                {/* Lista de productos */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900 dark:text-white">Productos:</h5>
                  {(showTicket.products || []).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name || 'Producto'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Cantidad: {item.quantity || 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ${(item.price || 0).toFixed(2)} c/u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Totales */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-2">
                  {showTicket.subtotal && showTicket.subtotal !== showTicket.total && (
                    <>
                      <div className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                        <span>Subtotal:</span>
                        <span>${(showTicket.subtotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span>Descuento aplicado:</span>
                        <span>-${((showTicket.subtotal || 0) - (showTicket.total || 0)).toFixed(2)}</span>
                      </div>
                      <hr className="border-gray-200 dark:border-gray-600" />
                    </>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span>${(showTicket.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Método de pago */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Método de pago:</p>
                    <p className="font-bold text-blue-800 dark:text-blue-300">
                      {showTicket.payment_method === 'stripe' ? '💳 Tarjeta (Stripe)' : 
                       showTicket.payment_method === 'cash' ? '💰 Efectivo' : 
                       showTicket.payment_method || '💳 Tarjeta'}
                    </p>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                  <h5 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
                    🔒 Información del Sistema
                  </h5>
                  <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-400">
                    <li>• Transacción procesada de forma segura</li>
                    <li>• Comprobante generado automáticamente</li>
                    <li>• Información respaldada en el sistema</li>
                    <li>• Conserve este comprobante como garantía</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  🖨️ Imprimir Comprobante
                </button>
                <button
                  onClick={() => {
                    const ticketData = `
=== ${businessName.toUpperCase()} ===
COMPROBANTE DE VENTA
TICKET: ${showTicket.ticket_id}
FECHA: ${showTicket.created_at ? new Date(showTicket.created_at).toLocaleString('es-AR') : 'N/A'}

PRODUCTOS:
${(showTicket.products || []).map((item: any) => 
  `- ${item.name || 'Producto'}: $${(item.price || 0).toFixed(2)} x${item.quantity || 1} = $${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`
).join('\n')}

TOTAL: $${(showTicket.total || 0).toFixed(2)}
MÉTODO: ${showTicket.payment_method === 'stripe' ? 'Tarjeta (Stripe)' : showTicket.payment_method || 'Efectivo'}

¡Gracias por su compra!
${businessName} - Sistema POS v1.0
                    `.trim();
                    
                    navigator.clipboard.writeText(ticketData).then(() => {
                      alert('✅ Información del ticket copiada al portapapeles');
                    }).catch(() => {
                      alert('❌ No se pudo copiar al portapapeles');
                    });
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  title="Copiar información del ticket"
                >
                  📋 Copiar
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  💡 Guarda este comprobante para tus registros
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
