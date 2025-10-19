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
    return d.toISOString().slice(0,10);
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
      
      // Convertir las ventas del localStorage al formato esperado
      const formattedLocalSales: Sale[] = localSales.map((sale: any) => ({
        id: sale.id || sale.ticket_id,
        ticket_id: sale.ticket_id || sale.id,
        created_at: sale.created_at || sale.date || new Date().toISOString(),
  products: sale.products || [],
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

  // Filtrar ventas por fecha seleccionada
  let filteredSales = sales.filter(sale => {
    const d = sale.created_at ? new Date(sale.created_at) : new Date();
    return d.toISOString().slice(0,10) === selectedDate;
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
                    {(sale.products || []).length} items
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

      {/* Modal para mostrar ticket */}
      {showTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={getThemeClass({dark:'bg-zinc-900',light:'bg-white'}) + " p-6 rounded-lg shadow-lg max-w-md w-full mx-4"}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={getThemeClass({dark:'text-white',light:'text-gray-900'}) + " text-lg font-bold"}>
                Ticket #{showTicket.ticket_id}
              </h3>
              <button
                onClick={() => setShowTicket(null)}
                className={getThemeClass({dark:'text-gray-400 hover:text-white',light:'text-gray-600 hover:text-gray-900'}) + " text-xl"}
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <div className={getThemeClass({dark:'text-gray-300',light:'text-gray-600'}) + " text-sm mb-2"}>
                {businessName}
              </div>
              <div className={getThemeClass({dark:'text-gray-300',light:'text-gray-600'}) + " text-sm mb-4"}>
                {showTicket.created_at ? new Date(showTicket.created_at).toLocaleString() : 'N/A'}
              </div>
              
              <div className="space-y-2 mb-4">
                {(showTicket.products || []).map((item: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className={getThemeClass({dark:'text-white',light:'text-gray-900'})}>
                      {item.name || 'Producto'} x{item.quantity || 1}
                    </span>
                    <span className={getThemeClass({dark:'text-white',light:'text-gray-900'})}>
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span className={getThemeClass({dark:'text-white',light:'text-gray-900'})}>Total:</span>
                  <span className={getThemeClass({dark:'text-green-400',light:'text-green-600'})}>
                    ${(showTicket.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
