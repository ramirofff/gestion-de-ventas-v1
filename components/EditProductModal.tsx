import type { Category } from '../types/category';
import React from "react";

interface EditProductModalProps {
  product: { id: string; name: string; price: number; category: string };
  values: { name: string; price: string; category: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  error: string;
  success: boolean;
  categories: Category[];
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  values,
  onChange,
  onClose,
  onSave,
  loading,
  error,
  success,
  categories
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl border-2 border-blue-200 dark:border-blue-800 w-full max-w-md relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 text-2xl focus:ring-2 focus:ring-red-400"
          onClick={onClose}
          aria-label="Cerrar"
          tabIndex={0}
          role="button"
        >×</button>
        <h2 className="text-xl font-bold mb-4 text-blue-500">Editar producto</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">Nombre</label>
            <input
              name="name"
              value={values.name}
              onChange={onChange}
              className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-blue-200 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              maxLength={40}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Precio</label>
            <input
              name="price"
              type="number"
              min={1}
              value={values.price}
              onChange={onChange}
              className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-blue-200 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Categoría</label>
            <select
              name="category"
              value={values.category}
              onChange={onChange}
              className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-zinc-800 text-blue-900 dark:text-blue-200 px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Sin categoría</option>
              {categories.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-red-500 font-semibold text-sm">{error}</div>}
          {success && <div className="text-green-500 font-semibold text-sm">¡Guardado correctamente!</div>}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold py-2 px-4 rounded-lg flex-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              onClick={onClose}
              disabled={loading}
              role="button"
              aria-label="Cancelar"
            >Cancelar</button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex-1 transition-colors flex items-center justify-center gap-2"
              disabled={loading}
              role="button"
              aria-label="Guardar"
            >
              {loading && <span className="loader border-2 border-blue-200 border-t-blue-500 rounded-full w-5 h-5 mr-2 animate-spin"></span>}
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
