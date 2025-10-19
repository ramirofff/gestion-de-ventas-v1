"use client";
import { useState, useEffect, useRef } from 'react';
import { Category } from '../types/category';
import { uploadProductImage } from '../lib/uploadImage';
import { useCategories } from '../hooks/useCategories';
import { supabase } from '../lib/supabaseClient';

interface Props {
  categories: Category[];
  onSubmit: (data: { name: string; price: number; original_price: number; category: string; image_url?: string | null }) => Promise<{ error?: Error; data?: any } | undefined>;
  loading?: boolean;
  getThemeClass: (opts: { dark: string; light: string }) => string;
  userId: string | null;
}

export function AddProductForm({ categories, onSubmit, loading, getThemeClass, userId }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  // useRef para persistir el archivo de imagen aunque el estado se reinicie
  const imageRef = useRef<File | null>(null);
  const [image, setImageState] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoType, setInfoType] = useState<'success' | 'error' | 'info' | null>(null);
  // Guardar la última categoría creada localmente para poder seleccionarla inmediatamente
  const [lastCreatedCategoryId, setLastCreatedCategoryId] = useState<string | null>(null);
  // Mostrar input de nueva categoría como bloque debajo del selector
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Hook para gestionar categorías (solo usamos addCategory)
  const { addCategory } = useCategories();

  // Actualizar categoría seleccionada cuando cambien las categorías
  useEffect(() => {
    console.log('Categorías actualizadas:', categories);
    // Solo verificar si la categoría seleccionada aún existe en la lista
    if (category && categories.length > 0) {
      const categoryExists = categories.some(cat => cat.id === category);
      console.log('¿Categoría actual existe?', categoryExists, 'ID:', category, 'última creada:', lastCreatedCategoryId);
      // Si la categoría no existe en la lista pero coincide con la última creada, la permitimos (aún no se propagó la lista)
      if (!categoryExists && category !== lastCreatedCategoryId) {
        console.log('Categoría no encontrada, sin categoría seleccionada');
        setCategory(''); // Sin categoría por defecto
      }
    }
    // Limpiar mensajes de error si hay categorías disponibles
    if (error === 'No hay categorías disponibles. Crea una categoría primero.') {
      setError(null);
    }
  }, [categories, category, error, lastCreatedCategoryId]);

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
      const categoryExists = categories.some(cat => cat.id === category) || category === lastCreatedCategoryId;
      if (!categoryExists) {
        setError('La categoría seleccionada no es válida. Por favor, selecciona otra categoría.');
        return;
      }
    }

    // Optimistic flow: crear primero, luego subir imagen en background y actualizar la fila.
    setUploading(true);
    console.log('[AddProductForm] handleSubmit - image currently set?:', !!image, image?.name);
    try {
      const fileToUpload = imageRef.current;

      const createResult = await onSubmit({
        name,
        price: parseFloat(price),
        original_price: parseFloat(price),
        category,
        image_url: null, // nunca undefined
      });

      if (createResult && createResult.error) {
        setError('Error al guardar el producto: ' + createResult.error.message);
        setInfoMsg('Error al guardar el producto: ' + createResult.error.message);
        setInfoType('error');
        setUploading(false);
        return;
      }

      const createdRow = createResult && (createResult as any).data && (createResult as any).data[0];
      console.log('[AddProductForm] createResult:', createResult, 'createdRow:', createdRow);

      let imageSuccess = false;
      if (fileToUpload && createdRow && createdRow.id) {
        setInfoMsg('Subiendo imagen...');
        setInfoType('info');
        try {
          const url = await uploadProductImage(fileToUpload);
          if (url) {
            const { error } = await supabase.from('products').update({ image_url: url }).eq('id', createdRow.id);
            if (error) {
              setInfoMsg('Error actualizando producto con imagen: ' + error.message);
              setInfoType('error');
              console.error('Error actualizando producto con image_url:', error);
            } else {
              setInfoMsg('¡Producto e imagen subidos correctamente!');
              setInfoType('success');
              document.dispatchEvent(new CustomEvent('productUpdated', { detail: { id: createdRow.id, image_url: url } }));
              imageSuccess = true;
            }
          } else {
            setInfoMsg('Error al subir la imagen. El producto fue creado, pero la imagen no se pudo subir.');
            setInfoType('error');
            console.warn('Subida en background falló o devolvió null para', createdRow.id);
          }
        } catch (err) {
          setInfoMsg('Error inesperado al subir la imagen. El producto fue creado, pero la imagen no se pudo subir.');
          setInfoType('error');
          console.error('Error en subida background:', err);
        }
      }

      // Éxito de creación (aunque la imagen falle)
      setName('');
      setPrice('');
      setCategory('');
      setImageState(null);
      imageRef.current = null;
      setUploading(false);
      if (fileToUpload && !imageSuccess) {
        setInfoMsg('El producto fue creado, pero la imagen no se pudo subir.');
        setInfoType('error');
      } else {
        setInfoMsg('¡Producto agregado correctamente!');
        setInfoType('success');
      }
      setTimeout(() => {
        const event = new CustomEvent('productAdded', { detail: { success: true } });
        document.dispatchEvent(event);
      }, 500);
    } catch (err: unknown) {
      setError('Error al guardar el producto: ' + (err instanceof Error ? err.message : String(err)));
      setInfoMsg('Error al guardar el producto: ' + (err instanceof Error ? err.message : String(err)));
      setInfoType('error');
      setUploading(false);
    }
  };

  // Función para crear una nueva categoría
  const handleCreateCategory = async (name: string) => {
    console.log('[AddProductForm] handleCreateCategory - start, current image?:', !!image, image?.name);
    if (!name || !name.trim()) {
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
      const { error, data } = await addCategory(name.trim(), userId);
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
      const newCategoryId = data[0].id;
      setLastCreatedCategoryId(newCategoryId);
      console.log('Nueva categoría creada con ID:', newCategoryId);
      setInfoMsg(`¡Categoría "${name}" creada y seleccionada!`);
      setInfoType('success');
      setCategory(newCategoryId);
      setShowNewCategoryInput(false);
      document.dispatchEvent(new CustomEvent('categoryAdded', { detail: { categoryId: newCategoryId, categoryName: name } }));
      // No hacer fetchCategories aquí, AdminPanel ya lo maneja tras categoryAdded
      setTimeout(() => {
        console.log('✅ Categoría seleccionada:', newCategoryId);
        console.log('✅ Estado React actualizado:', category);
        console.log('[AddProductForm] after createCategory - image state still:', !!image, image?.name);
      }, 100);
    } catch (err) {
      setInfoMsg('Error al crear categoría');
      setInfoType('error');
      console.error('Error al crear categoría:', err);
    }
  };

  // Limpia el marcador de la última categoría creada cuando el formulario se envía con éxito
  useEffect(() => {
    if (infoType === 'success' && infoMsg === '¡Producto agregado correctamente!') {
      setLastCreatedCategoryId(null);
    }
  }, [infoType, infoMsg]);

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
              setShowNewCategoryInput(true);
            }}
          >
            + Nueva
          </button>
        </div>
        {/* Input para nueva categoría debajo del selector */}
        {showNewCategoryInput && (
          <div className="mt-2 flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nombre de la nueva categoría"
              className={getThemeClass({dark:'rounded-lg px-3 py-2 bg-zinc-800 text-white','light':'rounded-lg px-3 py-2 bg-yellow-50 text-zinc-900 border border-yellow-200'})}
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <button
              type="button"
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-2 rounded-lg"
              onClick={async () => {
                // Guardar imagen actual en ref antes de crear categoría
                const currentImage = imageRef.current;
                await handleCreateCategory(newCategoryName);
                setNewCategoryName('');
                setShowNewCategoryInput(false);
                // Restaurar imagen seleccionada si existía
                if (currentImage) {
                  setImageState(currentImage);
                  imageRef.current = currentImage;
                  console.log('[AddProductForm] Imagen restaurada tras crear categoría:', currentImage.name);
                }
              }}
            >Guardar</button>
            <button
              type="button"
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-lg"
              onClick={() => {
                setShowNewCategoryInput(false);
                setNewCategoryName('');
              }}
            >Cancelar</button>
          </div>
        )}
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
            onChange={e => {
              const file = e.target.files?.[0] || null;
              setImageState(file);
              imageRef.current = file;
            }}
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
        disabled={loading || uploading || !userId}
      >
        {uploading ? 'Subiendo imagen...' : loading ? 'Agregando...' : 'Agregar producto'}
      </button>
    </form>
  );
}
