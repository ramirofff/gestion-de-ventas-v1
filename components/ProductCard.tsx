import { Product } from '../types/product';
import { formatCurrency } from '../lib/utils';
import { BadgePercent } from 'lucide-react';

interface Props {
  product: Product;
  onAdd: () => void;
  getThemeClass: (opts: { dark: string; light: string }) => string;
  categories: { id: string; name: string }[];
}

export function ProductCard({ product, onAdd, getThemeClass, categories }: Props) {
  const hasDiscount = product.price < product.original_price;
  const catName = categories.find(cat => cat.id === product.category)?.name || 'Sin categoría';
  return (
    <div className={getThemeClass({dark:'bg-zinc-900',light:'bg-yellow-50'}) + " rounded-xl p-4 flex flex-col items-center shadow-lg relative transition-colors border " + getThemeClass({dark:'border-zinc-800',light:'border-yellow-200'})}>
      <img src={product.image_url} alt={product.name} className="w-32 h-32 object-cover rounded-lg mb-2" />
      <h3 className={getThemeClass({dark:'text-white',light:'text-yellow-900'}) + " text-lg font-bold mb-1 text-center"}>{product.name}</h3>
      <span className="text-sm text-zinc-500 dark:text-zinc-300 mb-2">{catName}</span>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl font-bold text-yellow-400">{formatCurrency(product.price)}</span>
        {hasDiscount && (
          <>
            <span className={getThemeClass({dark:'line-through text-zinc-400 text-sm',light:'line-through text-yellow-400 text-sm'})}>{formatCurrency(product.original_price)}</span>
            <BadgePercent className="text-green-400 w-5 h-5" />
          </>
        )}
      </div>
      <button
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg text-lg mt-auto w-full transition-colors"
        onClick={onAdd}
      >
        Agregar
      </button>
    </div>
  );
}
