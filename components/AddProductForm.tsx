"use client";
import { useState, useEffect } from 'react';
import { Category } from '../types/category';
import { uploadProductImage } from '../lib/uploadImage';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabaseClient';

interface Props {
  categories: Category[];
  onSubmit: (data: { name: string; price: number; original_price: number; category: string; image_url: string }) => Promise<{ error?: Error } | undefined>;
  loading?: boolean;
  getThemeClass: (opts: { dark: string; light: string }) => string;
}

export function AddProductForm({ categories, onSubmit, loading, getThemeClass }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoType, setInfoType] = useState<'success' | 'error' | 'info' | null>(null);
  
  // Hook para gestionar categorías
  const { addCategory, fetchCategories } = useCategories();
  
  // Obtener user_id del usuario autenticado
  const [userId, setUserId] = useState<string | null>(null);
  
  // Cargar user_id al montar
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('Error al obtener sesión:', sessionError);
          setUserId(null);
          return;
        }
        
        if (!session) {
          console.warn('No hay sesión activa');
          setUserId(null);
          return;
        }
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.warn('Error al obtener usuario:', userError);
          setUserId(null);
          return;
        }
        
        setUserId(user?.id ?? null);
      } catch (error) {
        console.warn('Error inesperado al obtener usuario:', error);
        setUserId(null);
      }
    };
    
    getUser();
  }, []);
  
  // Actualizar categoría seleccionada cuando cambien las categorías
  useEffect(() => {
    console.log('Categorías actualizadas:', categories);
    // Solo verificar si la categoría seleccionada aún existe en la lista
    if (category && categories.length > 0) {
      const categoryExists = categories.some(cat => cat.id === category);
      console.log('¿Categoría actual existe?', categoryExists, 'ID:', category);
      if (!categoryExists) {
        console.log('Categoría no encontrada, sin categoría seleccionada');
        setCategory(''); // Sin categoría por defecto
      }
    }
    // Limpiar mensajes de error si hay categorías disponibles
    if (error === 'No hay categorías disponibles. Crea una categoría primero.') {
      setError(null);
    }
  }, [categories, category, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validaciones
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!price || isNaN(Number(price))) {
      setError('El precio es obligatorio y debe ser un número.');
      return;
    }
    
    // La categoría es opcional, pero si se selecciona debe ser válida
    if (category) {
      // Verificar que la categoría exista en la lista actual
      const categoryExists = categories.some(cat => cat.id === category);
      if (!categoryExists) {
        setError('La categoría seleccionada no es válida. Por favor, selecciona otra categoría.');
        return;
      }
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
      } catch (err: unknown) {
        let msg = 'Error al subir la imagen: ';
        if (err && typeof err === 'object' && 'message' in err) {
          msg += (err as { message: string }).message;
        } else {
          msg += String(err);
        }
        setError(msg);
        setUploading(false);
        return;
      }
    }
    try {
      const result = await onSubmit({
        name,
        price: parseFloat(price),
        original_price: parseFloat(price), // El precio actual se guarda como precio original para nuevos productos
        category,
        image_url,
      });
      // Si el submit retorna error, mostrarlo
      if (result && result.error) {
        setError('Error al guardar el producto: ' + result.error.message);
        setInfoMsg('Error al guardar el producto: ' + result.error.message);
        setInfoType('error');
      } else {
        setName('');
        setPrice('');
        setCategory(''); // Sin categoría por defecto
        setImage(null);
        setInfoMsg('¡Producto agregado correctamente!');
        setInfoType('success');
        
        // Esperar un breve momento para mostrar el mensaje de éxito antes de cerrar el formulario
        setTimeout(() => {
          const event = new CustomEvent('productAdded', { detail: { success: true } });
          document.dispatchEvent(event);
        }, 1500);
      }
    } catch (err: unknown) {
      setError('Error al guardar el producto: ' + (err instanceof Error ? err.message : String(err)));
      setInfoMsg('Error al guardar el producto: ' + (err instanceof Error ? err.message : String(err)));
      setInfoType('error');
    }
    setUploading(false);
  };

  // Función para crear una nueva categoría
  const handleCreateCategory = async () => {
    const input = document.getElementById('new-category-name') as HTMLInputElement;
    const name = input?.value?.trim();
    
    if (!input) {
      console.error('❌ No se encontró el input de nueva categoría');
      setInfoMsg('Error: No se encontró el campo de categoría.');
      setInfoType('error');
      return;
    }
    
    if (!name) {
      setInfoMsg('El nombre de la categoría es obligatorio.');
      setInfoType('error');
      return;
    }
    
    if (!userId) {
      setInfoMsg('No se pudo obtener el usuario. Por favor, inicia sesión.');
      setInfoType('error');
      return;
    }
    
    try {
      setInfoMsg('Creando categoría...');
      setInfoType('info');
      
      // Crear la categoría usando el hook
      const { error, data } = await addCategory(name, userId);
      
      if (error) {
        setInfoMsg('Error al crear categoría: ' + error.message);
        setInfoType('error');
        return;
      }
      
      if (!data || !data[0] || !data[0].id) {
        setInfoMsg('Error: No se pudo obtener el ID de la categoría creada');
        setInfoType('error');
        return;
      }
      
      // La categoría se creó correctamente
      const newCategoryId = data[0].id;
      console.log('Nueva categoría creada con ID:', newCategoryId);
      
      // Actualizar el mensaje para el usuario
      setInfoMsg(`¡Categoría "${name}" creada y seleccionada!`);
      setInfoType('success');
      
      // Actualizar el estado de React inmediatamente
      setCategory(newCategoryId);
      
      // Cerrar el input de nueva categoría
      const categoryInput = document.getElementById('new-category-input');
      if (categoryInput) {
        (input as HTMLInputElement).value = '';
        categoryInput.style.display = 'none';
      }
      
      // Disparar evento para que el AdminPanel sepa que hay una nueva categoría
      document.dispatchEvent(new CustomEvent('categoryAdded', { 
        detail: { categoryId: newCategoryId, categoryName: name }
      }));
      
      // Actualizar las categorías para que aparezca la nueva en la lista
      if (fetchCategories) {
        try {
          await fetchCategories();
          console.log('✅ Categorías actualizadas después de crear nueva');
        } catch (error) {
          console.error('Error al actualizar categorías:', error);
        }
      }
      
      // Verificar que la categoría se seleccionó correctamente (opcional, solo para debug)
      setTimeout(() => {
        console.log('✅ Categoría seleccionada:', newCategoryId);
        console.log('✅ Estado React actualizado:', category);
      }, 100);
    } catch (err) {
      setInfoMsg('Error al crear categoría');
      setInfoType('error');
      console.error('Error al crear categoría:', err);
    }
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
          placeholder="Nombre del producto"
        />
      </div>
      <div>
        <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Precio</label>
        <input
          type="number"
          className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
          min={0}
          step="0.01"
          placeholder="Precio del producto"
        />
        <p className={getThemeClass({dark:'text-zinc-400 text-xs mt-1',light:'text-yellow-700 text-xs mt-1'})}>
          💡 Este será el precio original del producto. Si luego lo modificas a un precio menor, se calculará automáticamente el descuento.
        </p>
      </div>
      <div>
        <label className={getThemeClass({dark:'block text-zinc-300 mb-1',light:'block text-yellow-900 mb-1 font-semibold'})}>Categoría</label>
        <div className="flex gap-2 items-center">
          <select
            id="category-select"
            className={getThemeClass({dark:'w-full rounded-lg px-3 py-2 bg-zinc-800 text-white', light:'w-full rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
            value={category}
            onChange={e => {
              console.log('Categoría seleccionada:', e.target.value);
              setCategory(e.target.value);
            }}
          >
            <option value="">Sin categoría</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {/* Mostrar nombre de la categoría seleccionada */}
          <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-300">
            {category ? (categories.find(cat => cat.id === category)?.name || 'Categoría no encontrada') : 'Sin categoría'}
          </span>
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg whitespace-nowrap"
            onClick={() => {
              setInfoMsg('');
              setInfoType(null);
              const input = document.getElementById('new-category-input') as HTMLDivElement;
              if (input) input.style.display = 'flex';
            }}
          >
            + Nueva
          </button>
        </div>
        {/* Input para nueva categoría, oculto por defecto */}
        <div style={{ display: 'none' }} id="new-category-input" className="mt-2 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Nombre de la nueva categoría"
            className={getThemeClass({dark:'rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
            id="new-category-name"
          />
          <button
            type="button"
            className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-2 rounded-lg"
            onClick={handleCreateCategory}
          >
            Guardar
          </button>
          <button
            type="button"
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-lg"
            onClick={() => {
              const input = document.getElementById('new-category-input');
              if (input) input.style.display = 'none';
            }}
          >
            Cancelar
          </button>
        </div>
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
      {/* Mensaje visual en pantalla */}
      {infoMsg && (
        <div
          className={`my-4 px-4 py-3 rounded-xl font-bold text-lg text-center shadow-lg transition-all duration-300 ${
            infoType === 'success'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : infoType === 'error'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-blue-100 text-blue-700 border border-blue-300'
          }`}
          role="alert"
        >
          {infoMsg}
        </div>
      )}
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