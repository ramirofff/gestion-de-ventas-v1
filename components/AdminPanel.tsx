"use client";
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import { useState, useEffect } from 'react';
import { Boxes } from 'lucide-react';
import { useProductsContext } from '../components/ProductsProvider';
import { AddProductForm } from '../components/AddProductForm';
import { CategoryFilter } from '../components/CategoryFilter';
import { supabase } from '../lib/supabaseClient';

export function AdminPanel() {
  const { products, fetchProducts } = useProductsContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
  name: string;
  price: number | string;
  original_price: number | string;
  category: string;
}>({
  name: '',
  price: '',
  original_price: '',
  category: '',
});

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Simple theme helper
  function getThemeClass(classes: { dark: string; light: string }) {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return classes.dark;
    }
    return classes.light;
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []));
  }, []);

  // Pagination
  const pageSize = 10;
  const filteredProducts = products.filter(
    (p: Product) => p.user_id === userId && (!selectedCategory || p.category === selectedCategory)
  );
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  // Handlers
  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({
      name: product.name,
      price: product.price,
      original_price: product.original_price,
      category: product.category,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
setEditData({
  name: '',
  price: '',
  original_price: '',
  category: '',
});
  };
  const saveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const { name, price, original_price, category } = editData;
    await supabase.from('products').update({ name, price: Number(price), original_price: Number(original_price), category }).eq('id', editingId);
    await fetchProducts();
    setEditingId(null);
setEditData({
  name: '',
  price: '',
  original_price: '',
  category: '',
});
    setLoading(false);
  };
  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    setLoading(true);
    await supabase.from('products').delete().eq('id', id);
    await fetchProducts();
    setLoading(false);
  };
  const handleAddProduct = async (data: { name: string; price: number; original_price: number; category: string; image_url: string; }) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('products').insert([{ ...data, user_id: userId }]);
    if (error) setError(error.message);
    else {
      await fetchProducts();
      setShowAddForm(false);
    }
    setLoading(false);
  };
  const addCategory = async () => {
    const name = prompt('Nombre de la nueva categoría:');
    if (!name) return;
    const { error } = await supabase.from('categories').insert([{ name }]);
    if (!error) {
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories(data || []);
    }
  };
  const deleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await supabase.from('categories').delete().eq('id', id);
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2"><Boxes className="w-6 h-6" /> Administrar productos</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowAddForm((v) => !v)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold">
          {showAddForm ? 'Cerrar formulario' : 'Agregar producto'}
        </button>
      </div>
      {showAddForm && (
        <div className="mb-6">
          <AddProductForm categories={categories} onSubmit={handleAddProduct} loading={loading} getThemeClass={getThemeClass} />
        </div>
      )}
      <div className="mb-4">
        <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>
      <div className="overflow-x-auto">
        <table className={getThemeClass({dark:'min-w-full bg-zinc-800 rounded-xl overflow-hidden',light:'min-w-full bg-yellow-50 rounded-xl overflow-hidden'})}>
          <thead>
            <tr className={getThemeClass({dark:'text-zinc-300 text-left',light:'text-yellow-900 text-left'})}>
              <th className="p-3">Imagen</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Precio original</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product: Product) => (
              <tr key={product.id} className={getThemeClass({dark:'border-b border-zinc-700',light:'border-b border-yellow-200'})}>
                <td className="p-2"><img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded" /></td>
                <td className="p-2">
                  {editingId === product.id ? (
                    <input value={typeof editData.name === 'string' ? editData.name : ''} onChange={e => setEditData({ ...editData, name: e.target.value })} className={getThemeClass({dark:'bg-zinc-700 text-white',light:'bg-yellow-100 text-zinc-800'}) + " px-2 py-1 rounded"} />
                  ) : <span className={getThemeClass({dark:'text-white',light:'text-zinc-800'})}>{product.name}</span>}
                </td>
                <td className="p-2">
                  {editingId === product.id ? (
                    <input type="number" value={typeof editData.price === 'string' || typeof editData.price === 'number' ? editData.price : ''} onChange={e => setEditData({ ...editData, price: e.target.value })} className={getThemeClass({dark:'bg-zinc-700 text-white',light:'bg-yellow-100 text-zinc-800'}) + " px-2 py-1 rounded w-20"} />
                  ) : <span className={getThemeClass({dark:'text-white',light:'text-zinc-800'})}>{`$${product.price}`}</span>}
                </td>
                <td className="p-2">
                  {editingId === product.id ? (
                    <input type="number" value={typeof editData.original_price === 'string' || typeof editData.original_price === 'number' ? editData.original_price : ''} onChange={e => setEditData({ ...editData, original_price: e.target.value })} className={getThemeClass({dark:'bg-zinc-700 text-white',light:'bg-yellow-100 text-zinc-800'}) + " px-2 py-1 rounded w-20"} />
                  ) : <span className={getThemeClass({dark:'text-white',light:'text-zinc-800'})}>{`$${product.original_price}`}</span>}
                </td>
                <td className="p-2">
                  {editingId === product.id ? (
                    <select value={typeof editData.category === 'string' ? editData.category : ''} onChange={e => setEditData({ ...editData, category: e.target.value })} className={getThemeClass({dark:'bg-zinc-700 text-white',light:'bg-yellow-100 text-zinc-800'}) + " px-2 py-1 rounded"}>
                      {categories.map((cat: Category) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={getThemeClass({dark:'text-white',light:'text-zinc-800'})}>{categories.find((cat: Category) => cat.id === product.category)?.name || '-'}</span>
                  )}
                </td>
                <td className="p-2 flex gap-2">
                  {editingId === product.id ? (
                    <>
                      <button onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Guardar</button>
                      <button onClick={cancelEdit} className="bg-zinc-600 hover:bg-zinc-700 text-white px-2 py-1 rounded">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(product)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded">Editar</button>
                      <button onClick={() => deleteProduct(product.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold disabled:opacity-50">Anterior</button>
          <span className="px-2 py-1">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold disabled:opacity-50">Siguiente</button>
        </div>
      )}
      {/* Category delete buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {categories.map((cat: Category) => (
          <button key={cat.id} onClick={() => deleteCategory(cat.id)} className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm">Eliminar {cat.name}</button>
        ))}
      </div>
    </div>
  );
}