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
      // PASO 1: CARGAR DESDE LOCALSTORAGE (SISTEMA PRINCIPAL)
      console.log('💾 Cargando ventas desde localStorage (sistema principal)...');
      const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
      console.log('💾 Ventas encontradas en localStorage:', localSales.length);
      
      // LIMPIAR DUPLICADOS AUTOMÁTICAMENTE
      const uniqueSales: any[] = [];
      const seenIds = new Set<string>();
      const seenSessionIds = new Set<string>();
      
      localSales.forEach((sale: any) => {
        const saleId = sale.id?.toString();
        const sessionId = sale.session_id;
        const paymentIntentId = sale.stripe_payment_intent_id;
        
        // Verificar duplicados por múltiples criterios
        const isDuplicate = 
          (saleId && seenIds.has(saleId)) ||
          (sessionId && seenSessionIds.has(sessionId)) ||
          uniqueSales.some((existingSale: any) => 
            existingSale.stripe_payment_intent_id && 
            paymentIntentId && 
            existingSale.stripe_payment_intent_id === paymentIntentId
          );
        
        if (!isDuplicate) {
          uniqueSales.push(sale);
          if (saleId) seenIds.add(saleId);
          if (sessionId) seenSessionIds.add(sessionId);
        } else {
          console.log('🗑️ Eliminando duplicado:', saleId, sessionId);
        }
      });
      
      // Guardar la lista limpia de vuelta en localStorage
      if (uniqueSales.length !== localSales.length) {
        localStorage.setItem('sales', JSON.stringify(uniqueSales));
        console.log('🧹 Duplicados eliminados. Antes:', localSales.length, 'Después:', uniqueSales.length);
      }
      
      // Convertir las ventas del localStorage al formato esperado
      const formattedLocalSales: Sale[] = uniqueSales.map((sale: any) => ({
        id: sale.id || sale.ticket_id,
        ticket_id: sale.ticket_id || sale.id,
        created_at: sale.created_at || sale.date || new Date().toISOString(),
        products: sale.products || sale.items || [],
        items: sale.items || sale.products || [],
        total: Number(sale.total) || 0,
        subtotal: Number(sale.subtotal) || Number(sale.total) || 0,
        payment_method: sale.payment_method || 'stripe',
        payment_status: sale.payment_status || 'completed',
        status: sale.status || 'completed',
        user_id: sale.user_id || userId || 'local-user'
      }));
      
      setSales(formattedLocalSales);
      console.log('✅ Ventas cargadas desde localStorage:', formattedLocalSales.length);
      
      // PASO 2: INTENTAR CARGAR TAMBIÉN DE SUPABASE (OPCIONAL)
      if (userId) {
        try {
          console.log('🔄 Intentando cargar también desde Supabase (opcional)...');
          
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
            console.warn('⚠️ Error cargando desde Supabase (no crítico):', error);
          } else if (data && data.length > 0) {
            console.log('✅ También encontradas ventas en Supabase:', data.length);
            
            // Combinar ventas de localStorage y Supabase, evitando duplicados
            const combinedSales = [...formattedLocalSales];
            data.forEach(supabaseSale => {
              const exists = combinedSales.find(localSale => 
                localSale.id === supabaseSale.id || 
                localSale.ticket_id === supabaseSale.ticket_id ||
                (supabaseSale.created_at && localSale.created_at && 
                 Math.abs(new Date(localSale.created_at).getTime() - new Date(supabaseSale.created_at).getTime()) < 5000) // 5 segundos de diferencia
              );
              if (!exists) {
                combinedSales.push(supabaseSale);
              }
            });
            
            // Ordenar por fecha
            combinedSales.sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA;
            });
            setSales(combinedSales);
            console.log('✅ Ventas combinadas (localStorage + Supabase):', combinedSales.length);
          }
        } catch (supabaseError) {
          console.warn('⚠️ Error con Supabase (no crítico):', supabaseError);
        }
      }
      
      // PASO 3: CALCULAR TOTALES
      const allSales = formattedLocalSales; // Usar las ventas que tenemos seguras
      console.log('📊 Calculando totales con', allSales.length, 'ventas');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySales = allSales.filter(sale => {
        const saleDate = new Date(sale.created_at || new Date());
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
      });
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthSales = allSales.filter(sale => {
        const saleDate = new Date(sale.created_at || new Date());
        return saleDate >= thisMonth;
      });
      
      const todayAmount = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const monthAmount = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      setTodayTotal(todayAmount);
      setMonthTotal(monthAmount);
      
      console.log('📊 Totales calculados - Hoy:', todayAmount, 'Mes:', monthAmount);
      
    } catch (error) {
      console.error('❌ Error en fetchSales:', error);
      setSales([]);
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
    <div className={getThemeClass({dark:'bg-zinc-900',light:'bg-yellow-50'}) + " max-w-3xl mx-auto mt-10 rounded-2xl p-8 border " + getThemeClass({dark:'border-zinc-800',light:'border-yellow-200'}) + " shadow-2xl transition-colors"}>
      <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
        <ListOrdered className="w-6 h-6" /> Historial de ventas
      </h2>
      <div className="flex gap-8 mb-6 items-center">
        <div className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " text-lg font-bold"}>Total del día: <span className="text-yellow-400">${todayTotal.toFixed(2)}</span></div>
        <div className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " text-lg font-bold"}>Total del mes: <span className="text-yellow-400">${monthTotal.toFixed(2)}</span></div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className={"ml-auto rounded px-3 py-1 border transition-colors " + getThemeClass({dark:'bg-zinc-800 text-white border-zinc-700',light:'bg-yellow-50 text-yellow-900 border-yellow-200'})}
        />
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'})}>Cargando historial...</div>
        ) : filteredSales.length === 0 ? (
          <div className={getThemeClass({dark:'text-zinc-400',light:'text-yellow-700'})}>No hay ventas para este día.</div>
        ) : (
          <table className={"min-w-full rounded-xl overflow-hidden transition-colors " + getThemeClass({dark:'bg-zinc-800',light:'bg-yellow-100'})}>
            <thead className={getThemeClass({dark:'bg-zinc-700',light:'bg-yellow-200'})}>
              <tr>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Ticket ID</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Hora</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Productos</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Total</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Método</th>
                <th className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " px-4 py-2 text-left"}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale, index) => (
                <tr key={sale.id || index} className={getThemeClass({dark:'hover:bg-zinc-700',light:'hover:bg-yellow-50'}) + " transition-colors"}>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-4 py-3 font-mono"}>{sale.ticket_id}</td>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-4 py-3"}>
                    {sale.created_at ? new Date(sale.created_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-4 py-3"}>
                    {(sale.products || sale.items || []).length} items
                  </td>
                  <td className={getThemeClass({dark:'text-green-400',light:'text-green-600'}) + " px-4 py-3 font-bold"}>
                    ${(sale.total || 0).toFixed(2)}
                  </td>
                  <td className={getThemeClass({dark:'text-zinc-200',light:'text-yellow-800'}) + " px-4 py-3 capitalize"}>
                    {sale.payment_method || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setShowTicket(sale)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      Ver ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal para mostrar ticket mejorado */}
      {showTicket && (
        <div className={`${getThemeClass({dark:'bg-black bg-opacity-70',light:'bg-black bg-opacity-50'})} fixed inset-0 z-50 flex items-center justify-center p-4`}>
          <div className={`${getThemeClass({dark:'bg-zinc-900 text-white',light:'bg-white text-black'})} rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative`}>
            {/* Botón cerrar */}
            <button
              onClick={() => setShowTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10"
            >
              ×
            </button>
            
            {/* Ticket profesional */}
            <div className="p-8">
              {/* Header del negocio */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Mi Negocio</h2>
                <div className="text-gray-500 text-sm">Sistema de Gestión de Ventas</div>
                <div className="text-gray-400 text-xs">Av. Principal 123, Ciudad</div>
                <div className="text-gray-400 text-xs">Tel. (555) 123-4567</div>
              </div>
              
              {/* Línea separadora */}
              <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
              
              {/* Info del ticket */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">TICKET DE VENTA</h3>
                <div className="text-lg font-mono text-gray-700">#{showTicket.ticket_id}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {showTicket.created_at ? new Date(showTicket.created_at).toLocaleString() : 'N/A'}
                </div>
                <div className="text-xs text-gray-400 mt-1">Cajero: ramirozaratee@gmail.com</div>
              </div>
              
              {/* Productos */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3 pb-1 border-b border-gray-200">PRODUCTOS</h4>
                <div className="space-y-2">
                  {(showTicket.products || showTicket.items || []).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.name || 'Producto'}</div>
                        <div className="text-xs text-gray-500">
                          ${(item.price || 0).toFixed(2)} x {item.quantity || 1}
                        </div>
                      </div>
                      <div className="font-bold text-gray-800 ml-4">
                        ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Línea separadora */}
              <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
              
              {/* Total */}
              <div className="mb-6">
                <div className="flex justify-between items-center text-2xl font-bold">
                  <span className="text-gray-800">TOTAL A PAGAR:</span>
                  <span className="text-green-600">${(showTicket.total || 0).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-center text-xs text-gray-400 space-y-1">
                <div>¡Gracias por su compra!</div>
                <div>Conserve este ticket como comprobante</div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  Powered by Mi Negocio - POS v1.0
                </div>
              </div>
            </div>
            
            {/* Botón imprimir */}
            <div className="px-8 pb-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
