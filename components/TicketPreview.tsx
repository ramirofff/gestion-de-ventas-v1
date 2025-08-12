import { Sale } from '../types/sale';
import { formatCurrency, formatDate } from '../lib/utils';

interface Props {
  sale: Sale;
}

export function TicketPreview({ sale }: Props) {
  return (
    <div className="bg-white text-zinc-900 rounded-lg p-6 w-80 mx-auto shadow-lg">
      <h2 className="text-xl font-bold mb-2 text-center">Ticket #{sale.ticket_id || sale.id}</h2>
      <div className="mb-2 text-center text-zinc-500 text-sm">{sale.created_at ? formatDate(sale.created_at) : ''}</div>
      <div className="mb-4">
        {(sale.products || []).map((item: import('../types/sale').SaleProduct) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name} x{item.quantity}</span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-bold text-lg border-t pt-2">
        <span>Total</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>
    </div>
  );
}
