import { useState } from 'react';

interface Props {
  onSearch: (term: string) => void;
}

export function ProductSearch({ onSearch }: Props) {
  const [value, setValue] = useState('');
  return (
    <div className="mb-4 flex items-center gap-2">
      <input
        type="text"
        placeholder="Buscar producto..."
        value={value}
        onChange={e => {
          setValue(e.target.value);
          onSearch(e.target.value);
        }}
        className="w-full max-w-xs px-4 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 placeholder-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-semibold shadow-sm"
      />
      <span className="text-yellow-400 text-xl">🔍</span>
    </div>
  );
}
