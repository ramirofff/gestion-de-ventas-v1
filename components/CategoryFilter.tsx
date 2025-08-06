import { Category } from '../types/category';

interface Props {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: Props) {
  // Mostrar botón 'Sin categoría' si hay productos sin categoría
  // El filtro no tiene acceso directo a los productos, así que lo mostramos siempre
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      <button
        className={`px-4 py-2 rounded-lg font-bold ${selected === '' ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-800 text-white'}`}
        onClick={() => onSelect('')}
      >
        Todas
      </button>
      <button
        className={`px-4 py-2 rounded-lg font-bold ${selected === 'none' ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-800 text-white'}`}
        onClick={() => onSelect('none')}
      >
        Sin categoría
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          className={`px-4 py-2 rounded-lg font-bold ${selected === cat.id ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-800 text-white'}`}
          onClick={() => onSelect(cat.id)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
