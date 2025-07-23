"use client";
import { useState } from 'react';
import { Category } from '../types/category';
import { uploadProductImage } from '../lib/uploadImage';

interface Props {
  categories: Category[];
  onSubmit: (data: { name: string; price: number; original_price: number; category: string; image_url: string }) => void;
  loading?: boolean;
  getThemeClass: (opts: { dark: string; light: string }) => string;
}

export function AddProductForm({ categories, onSubmit, loading, getThemeClass }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || '');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!price || isNaN(Number(price))) {
      setError('El precio es obligatorio y debe ser un número.');
      return;
    }
    if (!category) {
      setError('Selecciona una categoría.');
      return;
    }
    if (originalPrice && (isNaN(Number(originalPrice)) || Number(originalPrice) > Number(price))) {
      setError('El precio original debe ser menor o igual al precio actual.');
      return;
    }
    setUploading(true);
    let image_url = '';
    if (image) {
      try {
        const url = await uploadProductImage(image);
        if (!url) {
          setError('Error al subir la imagen (sin URL).');
          setUploading(false);
          return;
        }
        image_url = url;
      } catch (err: any) {
        setError('Error al subir la imagen: ' + (err?.message || String(err)));
        setUploading(false);
        return;
      }
    }
    try {
      await onSubmit({
        name,
        price: parseFloat(price),
        original_price: parseFloat(originalPrice) || parseFloat(price),
        category,
        image_url,
      });
      setName('');
      setPrice('');
      setOriginalPrice('');
      setCategory(categories[0]?.id || '');
      setImage(null);
    } catch (err: any) {
      setError('Error al guardar el producto.');
    }
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={getThemeClass({dark:'space-y-4','light':'space-y-4'})}>
      <div>
        <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Nombre</label>
        <input
          className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Precio</label>
          <input
            type="number"
            className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
            min={0}
          />
        </div>
        <div className="flex-1">
          <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Precio original</label>
          <input
            type="number"
            className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
            value={originalPrice}
            onChange={e => setOriginalPrice(e.target.value)}
            min={0}
          />
        </div>
      </div>
      <div>
        <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Categoría</label>
        <select
          className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        >
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Imagen</label>
        <label className={getThemeClass({dark:'flex items-center gap-3 cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg border border-zinc-700',light:'flex items-center gap-3 cursor-pointer bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-lg border border-yellow-200'})}>
          <span className={getThemeClass({dark:'text-white',light:'text-zinc-900'})}>
            {image ? image.name : 'Seleccionar imagen...'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => setImage(e.target.files?.[0] || null)}
          />
          <span className="ml-auto text-green-400 font-bold">{image ? '✔️' : '📷'}</span>
        </label>
      </div>
      {error && <div className="text-red-500 text-sm text-center">{error}</div>}
      <button
        type="submit"
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg mt-2"
        disabled={loading || uploading}
      >
        {uploading ? 'Subiendo imagen...' : loading ? 'Agregando...' : 'Agregar producto'}
      </button>
    </form>
  );
}
