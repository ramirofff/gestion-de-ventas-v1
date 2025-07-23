import { Category } from '../types/category';

interface Props {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      <button
        className={`px-4 py-2 rounded-lg font-bold ${selected === '' ? 'bg-yellow-400 text-zinc-900' : 'bg-zinc-800 text-white'}`}
        onClick={() => onSelect('')}
      >
        Todas
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
