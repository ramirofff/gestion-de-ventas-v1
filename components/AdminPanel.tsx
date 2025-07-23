"use client";
import type { Product } from '../types/product';
import type { Category } from '../types/category';
import type { Sale } from '../types/sale';
import { useState, useEffect } from 'react';
import { Boxes } from 'lucide-react';
import { useProductsContext } from '../components/ProductsProvider';
import { AddProductForm } from '../components/AddProductForm';
import { CategoryFilter } from '../components/CategoryFilter';
import { supabase } from '../lib/supabaseClient';

interface Props {
  userId: string;
  getThemeClass: (opts: { dark: string; light: string }) => string;
}

export function AdminPanel({ userId, getThemeClass }: Props) {
  const { products, setProducts, fetchProducts } = useProductsContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Fetch categories
  useEffect(() => {
    supabase.from('categories').select('*').order('name').then((res) => setCategories(res.data || []));
  }, []);

  // Fetch sales
  useEffect(() => {
    setLoadingSales(true);
    supabase.from('sales').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then((res) => {
      setSales(res.data || []);
      setLoadingSales(false);
    });
  }, [userId]);

  // Inline edit handlers
  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({ ...product });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };
  const saveEdit = async () => {
    setLoading(true);
    setError(null);
    const { id, name, price, original_price, category, image_url } = editData;
    const { error } = await supabase.from('products').update({ name, price, original_price, category, image_url }).eq('id', id);
    if (error) setError(error.message);
    else {
      await fetchProducts();
      setEditingId(null);
      setEditData({});
    }
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

  // Category management
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

  // Filtered products (by user and category)
  const filteredProducts = products.filter(
    (p: Product) => p.user_id === userId && (!selectedCategory || p.category === selectedCategory)
  );

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
            {filteredProducts.map((product: Product) => (
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
      {/* Category delete buttons */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {categories.map((cat: Category) => (
          <button key={cat.id} onClick={() => deleteCategory(cat.id)} className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded text-sm">Eliminar {cat.name}</button>
        ))}
      </div>

      {/* Sales History removed for admin panel */}
    </div>
  );
}
