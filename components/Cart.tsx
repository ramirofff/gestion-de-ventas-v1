import { formatCurrency } from '../lib/utils';
import { CartItem } from '../hooks/useCart';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  items: CartItem[];
  total: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPay: () => void;
}

export function Cart({ items, total, onRemove, onClear, onPay }: Props) {
  return (
    <motion.div
      initial={{ y: 200 }}
      animate={{ y: 0 }}
      exit={{ y: 200 }}
      className="fixed bottom-4 right-4 bg-zinc-900 rounded-2xl shadow-2xl p-6 w-80 z-50 border border-zinc-700"
    >
      <h2 className="text-xl font-bold text-white mb-4">Carrito</h2>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.length === 0 && <p className="text-zinc-400">El carrito está vacío</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
            <span className="text-white font-medium">{item.name} x{item.quantity}</span>
            <span className="text-yellow-400 font-bold">{formatCurrency(item.price * item.quantity)}</span>
            <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 ml-2">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-lg text-white font-bold">Total:</span>
        <span className="text-2xl text-yellow-400 font-bold">{formatCurrency(total)}</span>
      </div>
      <div className="flex gap-2 mt-6">
        <button
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex-1"
          onClick={onClear}
        >
          Vaciar
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex-1 flex items-center justify-center gap-2"
          onClick={onPay}
        >
          <CheckCircle2 className="w-5 h-5" /> Pagar
        </button>
      </div>
    </motion.div>
  );
}
