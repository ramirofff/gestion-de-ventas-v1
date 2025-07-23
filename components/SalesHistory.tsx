"use client";
import type { Sale, SaleProduct } from '../types/sale';
import { useEffect, useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Props {
  userId: string;
  getThemeClass: (opts: { dark: string; light: string }) => string;
  limit?: number;
}

export function SalesHistory({ userId, getThemeClass, limit }: Props) {
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

  useEffect(() => {
    setLoading(true);
    supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
        if (data) {
          const now = new Date();
          const today = data.filter(sale => {
            const d = new Date(sale.created_at);
            return d.toDateString() === now.toDateString();
          });
          const month = data.filter(sale => {
            const d = new Date(sale.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          setTodayTotal(today.reduce((sum, s) => sum + (s.total || 0), 0));
          setMonthTotal(month.reduce((sum, s) => sum + (s.total || 0), 0));
        }
      });
  }, [userId]);

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
            <thead>
              <tr className={getThemeClass({dark:'text-zinc-300',light:'text-yellow-900'}) + " text-left"}>
                <th className="p-3">Fecha</th>
                <th className="p-3">Total</th>
                <th className="p-3">Productos</th>
                <th className="p-3">Ver ticket</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale: Sale) => (
                <tr key={sale.id} className={getThemeClass({dark:'border-b border-zinc-700 hover:bg-zinc-700/30',light:'border-b border-yellow-200 hover:bg-yellow-200/40'}) + " cursor-pointer transition-colors"}>
              <td className={getThemeClass({dark:'p-2 text-white',light:'p-2 text-zinc-900'})}>{sale.created_at ? new Date(sale.created_at).toLocaleString('es-ES') : ''}</td>
                  <td className="p-2 font-bold text-yellow-400">${sale.total?.toFixed(2)}</td>
                  <td className={getThemeClass({dark:'p-2 text-white',light:'p-2 text-zinc-900'})}>
                    <ul className={getThemeClass({dark:'list-disc pl-4 text-white',light:'list-disc pl-4 text-zinc-900'})}>
                      {sale.products?.map((item: SaleProduct) => (
                        <li key={item.id}>{item.name} x{item.quantity}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-2">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded" onClick={() => setShowTicket(sale)}>
                      Ver ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal ticket */}
      {showTicket && (
        <div className={getThemeClass({dark:'bg-black/70',light:'bg-black/30'}) + " fixed inset-0 z-50 flex items-center justify-center transition-colors"}>
          <div className={getThemeClass({dark:'bg-white text-zinc-900',light:'bg-yellow-50 text-yellow-900'}) + " rounded-lg p-8 w-96 mx-auto shadow-2xl relative transition-colors border " + getThemeClass({dark:'border-zinc-200',light:'border-yellow-200'})}>
            <button className="absolute top-3 right-3 text-zinc-400 hover:text-black" onClick={() => setShowTicket(null)}>×</button>
            <h2 className="text-xl font-bold mb-2 text-center">Ticket #{showTicket?.ticket_id || showTicket?.id}</h2>
            <div className="mb-2 text-center text-zinc-500 text-sm">{showTicket?.created_at ? new Date(showTicket.created_at).toLocaleString('es-ES') : ''}</div>
            <div className="mb-4">
              {showTicket?.products?.map((item: SaleProduct) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>${showTicket?.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
