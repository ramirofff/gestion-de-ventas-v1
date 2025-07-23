

"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Boxes, ListOrdered, ShoppingCart, CheckCircle2, BarChart2, PieChart, Zap, HelpCircle } from 'lucide-react';

import { useProductsContext } from '../components/ProductsProvider';
import { ProductCard } from '../components/ProductCard';
import EditProductModal from '@/components/EditProductModal';
import { useCart } from '../hooks/useCart';
import { createSale } from '../lib/sales';
import { supabase } from '../lib/supabaseClient';
import { AddProductForm } from '../components/AddProductForm';
import { CategoryFilter } from '../components/CategoryFilter';
import { AdminPanel } from '../components/AdminPanel';
import { SalesHistory } from '../components/SalesHistory';
import { QRDisplay } from '../components/QRDisplay';
import { useCategories } from '../hooks/useCategories';
import { ProductSearch } from '../components/ProductSearch';



// ...existing code...


type ViewType = 'home' | 'admin' | 'sales' | 'reports' | 'stats' | 'shortcuts' | 'help';

export default function Home() {
  // --- Estado y lógica para edición de producto ---
  type EditProductType = { id: string; name: string; price: number; category: string } | null;
  const [editProduct, setEditProduct] = useState<EditProductType>(null);
  const [editValues, setEditValues] = useState<{ name: string; price: string; category: string }>({ name: '', price: '', category: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function openEditProduct(product: any) {
    setEditProduct(product);
    setEditValues({
      name: product.name,
      price: product.price ? product.price.toString() : '',
      category: product.category || ''
    });
    setEditError('');
    setEditSuccess(false);
  }

  // Duplicar producto
  const duplicateProduct = useCallback(async (product: any) => {
    // Siempre enviar original_price, aunque el producto original no lo tenga
    const originalPrice = typeof product.original_price === 'number' && !isNaN(product.original_price)
      ? product.original_price
      : product.price;
    const { error } = await supabase.from('products').insert({
      name: product.name + ' (Copia)',
      price: product.price,
      original_price: originalPrice,
      category: product.category
    });
    if (error) {
      setToast({ type: 'error', message: 'Error al duplicar: ' + error.message });
    } else {
      setToast({ type: 'success', message: 'Producto duplicado.' });
      if (typeof window !== 'undefined') window.location.reload();
    }
  }, []);

  async function handleEditSave() {
    setEditError('');
    setEditSuccess(false);
    // Validaciones frontend
    if (!editValues.name.trim()) {
      setEditError('El nombre es obligatorio.');
      setToast({ type: 'error', message: 'El nombre es obligatorio.' });
      return;
    }
    if (!editValues.price || isNaN(Number(editValues.price)) || Number(editValues.price) <= 0) {
      setEditError('El precio debe ser un número mayor a 0.');
      setToast({ type: 'error', message: 'El precio debe ser un número mayor a 0.' });
      return;
    }
    setEditLoading(true);
    const { error } = await supabase
      .from('products')
      .update({
        name: editValues.name.trim(),
        price: Number(editValues.price),
        category: editValues.category
      })
      .eq('id', editProduct?.id);
    setEditLoading(false);
    if (error) {
      setEditError('Error al guardar: ' + error.message);
      setToast({ type: 'error', message: 'Error al guardar: ' + error.message });
      return;
    }
    setEditSuccess(true);
    setToast({ type: 'success', message: '¡Guardado correctamente!' });
    // Actualizar productos localmente (sin recargar)
    // Aquí deberías actualizar el contexto de productos si tienes esa función, si no, recarga
    if (typeof window !== 'undefined') window.location.reload();
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) {
    setEditValues(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  // Cerrar modal con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && editProduct) setEditProduct(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editProduct]);


  // ...hooks y utilidades...

  // ...hooks y utilidades...

  // ...hooks y utilidades...

  // ...hooks y utilidades...
  // Estados principales que se usan en hooks/utilidades
  const [user, setUser] = useState<any>(null);
  // Cargar usuario autenticado de Supabase al montar y en cambios de sesión
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
    // Suscribirse a cambios de sesión
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);
  const [view, setView] = useState<ViewType>('home');
  const [reportes, setReportes] = useState<{ totalVentas: number; cantidadTickets: number; promedio: number } | null>(null);

  // Lógica para reportes y ventas
  const [ventas, setVentas] = useState<any[]>([]);
  useEffect(() => {
    if (user) {
      (async () => {
        const { data, error } = await supabase
          .from('sales')
          .select('id, total, products')
          .eq('user_id', user.id);
        if (!error && data) {
          setVentas(data);
          if (view === 'reports') {
            const totalVentas = data.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
            const cantidadTickets = data.length;
            const promedio = cantidadTickets > 0 ? totalVentas / cantidadTickets : 0;
            setReportes({ totalVentas, cantidadTickets, promedio });
          }
        } else {
          setVentas([]);
          setReportes(null);
        }
      })();
    }
  }, [view, user]);
  // Estado para el nombre del negocio editable
  const [editingName, setEditingName] = useState(false);
  const [businessName, setBusinessName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('businessName') || 'Gestion de ventas V1';
    }
    return 'Gestion de ventas V1';
  });
  const saveBusinessName = (name: string) => {
    setEditingName(false);
    setBusinessName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('businessName', name);
    }
  };

  // Función para pagar (placeholder, debe tener la lógica real de pago)
  const handlePay = () => {
    setPaying(true);
    setShowQR(true);
    setTimeout(() => {
      setShowQR(false);
      setPaying(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
      setTicket({
        ticket_id: Math.floor(Math.random() * 100000),
        date: new Date(),
        products: cart,
        total,
      });
      clearCart();
    }, 3000);
  };

  // ...existing code...

  // ...existing code...
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });
  // Resto de estados
  const { products, loading, setProducts } = useProductsContext();
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState('');
  const { cart, addToCart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('favoriteProducts') || '[]');
    }
    return [];
  });
  const [orderNote, setOrderNote] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [showAddAnim, setShowAddAnim] = useState(false);
  const subtotal = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const discountValue = discountType === 'amount' ? discount : Math.round((subtotal * discount) / 100);
  const total = Math.max(0, subtotal - discountValue);
  const [showQR, setShowQR] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);


  // --- UTILIDADES VISUALES ---
  const getThemeClass = useCallback((options: { dark: string; light: string }) => theme === 'dark' ? options.dark : options.light, [theme]);
  const bgMain = getThemeClass({ dark: 'bg-zinc-950', light: 'bg-white' });
  const textMain = getThemeClass({ dark: 'text-white', light: 'text-zinc-900' });
  const cardBg = getThemeClass({ dark: 'bg-zinc-900 border-zinc-800', light: 'bg-white border-zinc-200' });
  const cardShadow = getThemeClass({ dark: 'shadow-2xl', light: 'shadow-lg' });
  const btnBase = 'rounded-xl px-6 py-4 flex items-center gap-3 font-bold shadow transition-colors border duration-200';
  const btnAdmin = getThemeClass({ dark: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white', light: 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-900' });
  const btnSales = getThemeClass({ dark: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white', light: 'bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-900' });
  const btnTheme = getThemeClass({ dark: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white', light: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-900' });
  const btnReports = getThemeClass({ dark: 'bg-purple-900 hover:bg-purple-800 border-purple-800 text-white', light: 'bg-purple-100 hover:bg-purple-200 border-purple-200 text-purple-900' });
  const btnStats = getThemeClass({ dark: 'bg-pink-900 hover:bg-pink-800 border-pink-800 text-white', light: 'bg-pink-100 hover:bg-pink-200 border-pink-200 text-pink-900' });
  const btnConfig = getThemeClass({ dark: 'bg-green-900 hover:bg-green-800 border-green-800 text-white', light: 'bg-green-100 hover:bg-green-200 border-green-200 text-green-900' });
  const btnShortcuts = getThemeClass({ dark: 'bg-orange-900 hover:bg-orange-800 border-orange-800 text-white', light: 'bg-orange-100 hover:bg-orange-200 border-orange-200 text-orange-900' });
  const btnHelp = getThemeClass({ dark: 'bg-blue-900 hover:bg-blue-800 border-blue-800 text-white', light: 'bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-900' });
  const btnUsers = getThemeClass({ dark: 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white', light: 'bg-zinc-200 hover:bg-zinc-300 border-zinc-300 text-zinc-900' });
  const btnBack = getThemeClass({ dark: 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700', light: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200' });
  const modalBg = getThemeClass({ dark: 'bg-white text-zinc-900', light: 'bg-yellow-50 text-yellow-900' });
  const modalText = getThemeClass({ dark: 'text-zinc-900', light: 'text-yellow-900' });
  const modalBorder = getThemeClass({ dark: 'border-zinc-200', light: 'border-yellow-200' });
  const overlayBg = getThemeClass({ dark: 'bg-black/70', light: 'bg-black/30' });

    // ...

  // ...existing code...

  // Utilidad para formatear moneda
  function formatCurrency(value: number) {
    return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  // (Eliminado duplicado de utilidades visuales)


  // --- BLOQUE DE VISTAS CONDICIONALES ---
  // (debe ir después de todos los hooks y utilidades, antes del return principal)
  // Secciones protegidas: solo si hay usuario
  if (view === 'admin' && user) {
    return (
      <main className={`min-h-screen ${bgMain} p-8`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold text-yellow-400 flex items-center gap-3`}>
            <Boxes className="w-8 h-8 text-green-400" /> Administrar productos
          </h1>
          <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
        </div>
        <div className={`mt-8 ${cardBg} ${cardShadow} rounded-2xl p-8 border`}>
          <AdminPanel userId={user?.id} getThemeClass={getThemeClass} />
        </div>
      </main>
    );
  }
  if (view === 'sales' && user) {
    return (
      <main className={`min-h-screen ${bgMain} p-8`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold text-blue-400 flex items-center gap-3`}>
            <ListOrdered className="w-8 h-8 text-blue-400" /> Historial de ventas
          </h1>
          <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
        </div>
        <div className={`mt-8`}>
          <SalesHistory userId={user?.id} getThemeClass={getThemeClass} />
        </div>
      </main>
    );
  }
  if (view === 'reports' && user) {
    return (
      <main className={`min-h-screen ${bgMain} p-8 flex flex-col items-center justify-center`}>
        <BarChart2 className="w-16 h-16 text-purple-400 animate-pulse mb-4" />
        <h1 className="text-3xl font-bold text-purple-500 mb-2">Reportes</h1>
        <p className="text-lg text-purple-300 mb-8">Visualiza reportes de ventas, ingresos y más.</p>
        <div className={`w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-purple-200 dark:border-purple-800 p-8 mb-8 flex flex-col gap-6`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Ventas totales</span>
            <span className="text-2xl font-bold text-purple-500">{reportes ? formatCurrency(reportes.totalVentas) : '...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Cantidad de tickets</span>
            <span className="text-2xl font-bold text-purple-500">{reportes ? reportes.cantidadTickets : '...'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Ticket promedio</span>
            <span className="text-2xl font-bold text-purple-500">{reportes ? formatCurrency(reportes.promedio) : '...'}</span>
          </div>
        </div>
        <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
      </main>
    );
  }
  if (view === 'stats' && user) {
    // Estadísticas reales: productos más vendidos y ventas por categoría
    // Contar ventas por producto
    const ventasPorProducto: Record<string, { producto: any, cantidad: number }> = {};
    ventas.forEach((venta: any) => {
      if (Array.isArray(venta.products)) {
        venta.products.forEach((item: any) => {
          if (!ventasPorProducto[item.id]) ventasPorProducto[item.id] = { producto: item, cantidad: 0 };
          ventasPorProducto[item.id].cantidad += item.quantity || 1;
        });
      }
    });
    // Top 5 productos vendidos
    const topProducts = Object.values(ventasPorProducto)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
    // Ventas por categoría (mostrar nombre, no ID)
    const ventasPorCategoria: Record<string, number> = {};
    Object.values(ventasPorProducto).forEach(({ producto, cantidad }) => {
      let catName = 'Sin categoría';
      if (producto.category) {
        // Buscar nombre en categories
        const catObj = categories.find((c: any) => c.id === producto.category || c.name === producto.category);
        catName = catObj?.name || producto.category;
      }
      ventasPorCategoria[catName] = (ventasPorCategoria[catName] || 0) + cantidad;
    });
    // Preparar datos para el gráfico de barras
    const maxVentasCat = Math.max(...Object.values(ventasPorCategoria), 1);
    return (
      <main className={`min-h-screen ${bgMain} p-8 flex flex-col items-center`}>
        <PieChart className="w-16 h-16 text-pink-400 animate-spin-slow mb-4" />
        <h1 className="text-3xl font-bold text-pink-500 mb-2">Estadísticas</h1>
        <p className="text-lg text-pink-300 mb-8">Gráficos y métricas de tu negocio.</p>
        <div className="w-full max-w-2xl grid md:grid-cols-2 gap-8 mb-8">
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-pink-200 dark:border-pink-800 p-6`}>
            <h2 className="text-xl font-bold text-pink-500 mb-4">Top productos vendidos</h2>
            {topProducts.length === 0 ? (
              <div className="text-zinc-400">No hay ventas registradas.</div>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((prod, idx: number) => (
                  <li key={prod.producto.id} className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{idx + 1}. {prod.producto.name}</span>
                    <span className="text-pink-400 font-bold">{prod.cantidad} ventas</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-pink-200 dark:border-pink-800 p-6`}>
            <h2 className="text-xl font-bold text-pink-500 mb-4">Ventas por categoría</h2>
            {Object.keys(ventasPorCategoria).length === 0 ? (
              <div className="text-zinc-400">No hay ventas registradas.</div>
            ) : (
              <>
                <div className="mb-4">
                  {/* Gráfico de barras simple */}
                  <div className="flex flex-col gap-2">
                    {Object.entries(ventasPorCategoria).map(([cat, ventas]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="w-24 truncate text-sm font-semibold text-zinc-700 dark:text-zinc-200">{cat}</span>
                        <div className="flex-1 bg-pink-100 dark:bg-pink-900 rounded h-6 relative">
                          <div
                            className="bg-pink-400 h-6 rounded transition-all"
                            style={{ width: `${(ventas / maxVentasCat) * 100}%` }}
                          ></div>
                          <span className="absolute left-2 top-0 h-6 flex items-center text-xs font-bold text-pink-900 dark:text-pink-100">{ventas}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ul className="space-y-2">
                  {Object.entries(ventasPorCategoria).map(([cat, ventas]) => (
                    <li key={cat} className="flex justify-between items-center">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">{cat}</span>
                      <span className="text-pink-400 font-bold">{ventas} ventas</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
      </main>
    );
  }
  if (view === 'shortcuts' && user) {
    // Atajos rápidos: aplicar descuentos y favoritos reales
    const favoritos = products.filter((p: any) => favoriteIds.includes(p.id));
    return (
      <main className={`min-h-screen ${bgMain} p-8 flex flex-col items-center`}>
        <Zap className="w-16 h-16 text-orange-400 animate-bounce mb-4" />
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Atajos rápidos</h1>
        <p className="text-lg text-orange-300 mb-8">Accede a descuentos y productos destacados.</p>
        <div className="w-full max-w-xl grid md:grid-cols-2 gap-8 mb-8">
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-orange-200 dark:border-orange-800 p-6`}>
            <h2 className="text-lg font-bold text-orange-500 mb-2">Descuentos rápidos</h2>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20, 50].map(val => (
                <button key={val} onClick={() => { setDiscountType('percent'); setDiscount(val); }} className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 px-4 py-2 rounded-lg font-bold border border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors">
                  {val}%
                </button>
              ))}
            </div>
          </div>
          <div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-orange-200 dark:border-orange-800 p-6`}>
            <h2 className="text-lg font-bold text-orange-500 mb-2">Favoritos</h2>
            <ul className="space-y-2">
              {favoritos.length === 0 ? (
                <li className="text-zinc-400">No tienes productos favoritos.</li>
              ) : (
                favoritos.map((prod: any) => (
                  <li key={prod.id} className="flex justify-between items-center">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{prod.name}</span>
                    <button onClick={() => addToCart(prod)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg font-bold">Agregar</button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
      </main>
    );
  }
  if (view === 'help' && user) {
    // Ejemplo de soporte/ayuda: preguntas frecuentes y contacto
    return (
      <main className={`min-h-screen ${bgMain} p-8 flex flex-col items-center`}>
        <HelpCircle className="w-16 h-16 text-blue-400 animate-pulse mb-4" />
        <h1 className="text-3xl font-bold text-blue-500 mb-2">Soporte / Ayuda</h1>
        <p className="text-lg text-blue-300 mb-8">Preguntas frecuentes y contacto técnico.</p>
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-blue-200 dark:border-blue-800 p-8 mb-8">
          <h2 className="text-lg font-bold text-blue-500 mb-4">Preguntas frecuentes</h2>
          <ul className="space-y-3">
            <li>
              <span className="font-semibold">¿Cómo agrego productos al carrito?</span><br />
              Haz clic en el botón "Agregar" en la tarjeta del producto.
            </li>
            <li>
              <span className="font-semibold">¿Cómo aplico un descuento?</span><br />
              Usa el campo de descuento en el carrito o los atajos rápidos.
            </li>
            <li>
              <span className="font-semibold">¿Cómo imprimo un ticket?</span><br />
              Después de pagar, haz clic en "Imprimir ticket" en la ventana del ticket.
            </li>
            <li>
              <span className="font-semibold">¿Cómo cambio el modo claro/oscuro?</span><br />
              Usa el botón de sol/luna en la barra superior.
            </li>
          </ul>
          <div className="mt-8">
            <h3 className="text-md font-bold text-blue-400 mb-2">¿Necesitas más ayuda?</h3>
            <p className="text-blue-300 mb-2">Contáctanos por email: <a href="mailto:soporte@fastfood-pos.com" className="underline text-blue-500">soporte@fastfood-pos.com</a></p>
            <p className="text-blue-300">O por WhatsApp: <a href="https://wa.me/5491123456789" target="_blank" rel="noopener noreferrer" className="underline text-blue-500">+54 9 11 2345-6789</a></p>
          </div>
        </div>
        <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>Volver al inicio</button>
      </main>
    );
  }
  // Vista principal
  return (
    <>
      <title>Gestion de ventas V1</title>
      <main className={`min-h-screen ${bgMain} p-8`}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 text-center">
            {editingName ? (
              <input
                className={getThemeClass({dark:'bg-zinc-900 text-yellow-400 border-zinc-700',light:'bg-yellow-50 text-yellow-900 border-yellow-200'}) + ' px-3 py-1 rounded border font-bold text-2xl'}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onBlur={() => saveBusinessName(businessName)}
                onKeyDown={e => { if (e.key === 'Enter') saveBusinessName(businessName); }}
                autoFocus
                maxLength={32}
              />
            ) : (
              <span onClick={() => setEditingName(true)} className="cursor-pointer hover:underline">{businessName}</span>
            )}
          </h1>
          {user && (
            <div className="flex items-center gap-4">
              <span className={theme === 'dark' ? 'text-zinc-300 text-sm' : 'text-zinc-700 text-sm'}>{user.email}</span>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Salir</button>
            </div>
          )}
        </div>
        {/* Botones de navegación y modo */}
        {user && (
          <div className="flex flex-wrap gap-4 mb-10 items-center animate-fade-in">
            <button onClick={() => setView('admin')} className={`${btnBase} ${btnAdmin} transition-transform hover:scale-105`}>
              <Boxes className="w-6 h-6 text-green-400" /> Administrar productos
            </button>
            <button onClick={() => setView('sales')} className={`${btnBase} ${btnSales} transition-transform hover:scale-105`}>
              <ListOrdered className="w-6 h-6 text-blue-400" /> Historial de ventas
            </button>
            <button onClick={() => setView('reports')} className={`${btnBase} ${btnReports} transition-transform hover:scale-105`}>
              <BarChart2 className="w-6 h-6 text-purple-400" /> Reportes
            </button>
            <button onClick={() => setView('stats')} className={`${btnBase} ${btnStats} transition-transform hover:scale-105`}>
              <PieChart className="w-6 h-6 text-pink-400" /> Estadísticas
            </button>
            <button onClick={() => setView('shortcuts')} className={`${btnBase} ${btnShortcuts} transition-transform hover:scale-105`}>
              <Zap className="w-6 h-6 text-orange-400" /> Atajos rápidos
            </button>
            <button onClick={() => setView('help')} className={`${btnBase} ${btnHelp} transition-transform hover:scale-105`}>
              <HelpCircle className="w-6 h-6 text-blue-400" /> Soporte / Ayuda
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`${btnBase} ${btnTheme} ml-4 transition-transform hover:scale-105`}
              aria-label="Toggle light/dark mode"
            >
              {theme === 'dark' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
            </button>
          </div>
        )}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <>
            <h2 className={`text-2xl font-bold mb-6 ${textMain}`}>Menú de productos</h2>
            <ProductSearch onSearch={setSearchTerm} />
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
              {loading ? (
                <div className={`col-span-full text-center ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>Cargando productos...</div>
              ) : products.length === 0 ? (
                <div className={`col-span-full text-center ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>No hay productos disponibles.</div>
              ) : (
                <>
                  {products
                    .filter((product: any) =>
                      (!selectedCategory || product.category === selectedCategory) &&
                      (!searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((product: any) => (
                      <div key={product.id} className={`relative group transition-all duration-200 ${product.inactive ? 'opacity-50 pointer-events-none' : ''}`} role="listitem">
                        <ProductCard product={product} onAdd={() => {
                          addToCart(product);
                          setShowAddAnim(true);
                          setTimeout(() => setShowAddAnim(false), 500);
                        }} getThemeClass={getThemeClass} />
                        {/* Botón editar */}
                        <button
                          className="absolute top-2 right-10 z-10 text-xl text-blue-400 hover:text-blue-600 transition-colors bg-white/80 dark:bg-zinc-900/80 rounded-full p-1 shadow focus:ring-2 focus:ring-blue-400"
                          onClick={() => openEditProduct(product)}
                          aria-label="Editar producto"
                          tabIndex={0}
                          role="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                        </button>
                        {/* Botón duplicar */}
                        <button
                          className="absolute top-2 right-20 z-10 text-xl text-green-400 hover:text-green-600 transition-colors bg-white/80 dark:bg-zinc-900/80 rounded-full p-1 shadow focus:ring-2 focus:ring-green-400"
                          onClick={() => duplicateProduct(product)}
                          aria-label="Duplicar producto"
                          tabIndex={0}
                          role="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        </button>
                        {/* Botón favorito */}
                        <button
                          className={`absolute top-2 right-2 z-10 text-2xl ${favoriteIds.includes(product.id) ? 'text-yellow-400' : 'text-zinc-400 hover:text-yellow-400'} transition-colors focus:ring-2 focus:ring-yellow-400`}
                          onClick={() => {
                            setFavoriteIds(favs => {
                              const updated = favs.includes(product.id)
                                ? favs.filter(id => id !== product.id)
                                : [...favs, product.id];
                              localStorage.setItem('favoriteProducts', JSON.stringify(updated));
                              return updated;
                            });
                          }}
                          aria-label="Favorito"
                          tabIndex={0}
                          role="button"
                        >★</button>
                      </div>
                    ))}
                  {editProduct && (
                    <EditProductModal
                      product={editProduct}
                      values={editValues}
                      onChange={handleEditChange}
                      onClose={() => setEditProduct(null)}
                      onSave={handleEditSave}
                      loading={editLoading}
                      error={editError}
                      success={editSuccess}
                      categories={categories}
                    />
                  )}
                </>
              )}
            </div>
          </>
        </div>
        {/* Carrito fijo a la derecha en desktop */}
        {cart.length > 0 && (
          <div className="w-full lg:w-[24rem] lg:sticky lg:top-24 flex-shrink-0">
            <div className={`${cardBg} ${cardShadow} p-6 border rounded-2xl animate-fade-in transition-colors duration-200`}>
              <h2 className={`text-xl font-bold mb-4 ${textMain}`}>Carrito</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className={`${getThemeClass({dark:'bg-zinc-800',light:'bg-yellow-50'})} flex items-center justify-between rounded-lg px-3 py-2 transition-colors`}>
                    <span className={getThemeClass({dark:'text-white font-medium',light:'text-yellow-900 font-medium'})}>{item.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-lg font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        aria-label="Disminuir cantidad"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => {
                          const qty = Math.max(1, Number(e.target.value) || 1);
                          updateQuantity(item.id, qty);
                        }}
                        className="w-12 text-center rounded border border-zinc-300 dark:border-zinc-600 bg-transparent font-bold"
                        aria-label="Cantidad"
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-lg font-bold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        aria-label="Aumentar cantidad"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-yellow-400 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 ml-2" aria-label="Eliminar producto">✕</button>
                  </div>
                ))}
              </div>
              {/* Descuento visual mejorado y colorido + tipo */}
              <div className="mt-6">
                <label className="block text-sm font-semibold mb-1" htmlFor="discount-input">
                  <span className={textMain}>Descuento</span>
                </label>
                <div
                  className={
                    `flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-sm transition-colors ` +
                    (theme === 'dark'
                      ? 'bg-gradient-to-r from-yellow-900 via-yellow-800 to-yellow-700 border-yellow-700'
                      : 'bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-200 border-yellow-300')
                  }
                >
                  <span className="text-yellow-500 text-2xl font-extrabold mr-1">💸</span>
                  <input
                    id="discount-input"
                    type="number"
                    min={0}
                    max={discountType === 'amount' ? subtotal : 100}
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value) || 0)}
                    className={
                      `w-20 px-3 py-2 rounded-lg font-bold text-lg outline-none border-2 transition-colors ` +
                      (theme === 'dark'
                        ? 'bg-zinc-900 border-yellow-700 text-yellow-300 placeholder-yellow-700 focus:border-yellow-400'
                        : 'bg-yellow-50 border-yellow-300 text-yellow-700 placeholder-yellow-400 focus:border-yellow-500')
                    }
                    placeholder="0"
                  />
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'amount' | 'percent')}
                    className="rounded-lg border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-zinc-900 text-yellow-700 dark:text-yellow-200 px-2 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>
                  <span className={theme === 'dark' ? 'text-yellow-300 font-bold text-lg' : 'text-yellow-600 font-bold text-lg'}>{discountType === 'amount' ? '$' : '%'}</span>
                </div>
              </div>
              {/* Método de pago fijo: QR */}
              <div className="mt-4 flex items-center gap-2">
                <span className="block text-sm font-semibold text-yellow-700 dark:text-yellow-300">Método de pago:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-yellow-100 dark:bg-zinc-800 text-yellow-700 dark:text-yellow-200 font-bold border border-yellow-300 dark:border-yellow-700">QR</span>
              </div>
              <div className="flex flex-col gap-1 mt-4">
                <div className="flex justify-between items-center">
                  <span className={`text-base font-semibold ${textMain}`}>Subtotal:</span>
                  <span className="text-base text-yellow-700 dark:text-yellow-300 font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-base font-semibold ${textMain}`}>Descuento:</span>
                  <span className="text-base text-yellow-500 font-bold">-{discountValue > 0 ? `$${discountValue}` : '$0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${textMain}`}>Total:</span>
                  <span className="text-2xl text-yellow-400 font-bold">${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex-1 transition-colors"
                  onClick={() => {
                    if (window.confirm('¿Seguro que quieres vaciar el carrito?')) clearCart();
                  }}
                  role="button"
                  aria-label="Vaciar carrito"
                >
                  Vaciar
                </button>
      {/* Toast global */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg font-bold text-lg animate-fade-in ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          role="alert"
          aria-live="assertive"
          onAnimationEnd={() => setToast(null)}
        >
          {toast.message}
        </div>
      )}
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex-1 flex items-center justify-center gap-2 transition-colors"
                  onClick={handlePay}
                  disabled={paying || total <= 0}
                >
                  <CheckCircle2 className="w-5 h-5" /> {paying ? 'Pagando...' : 'Pagar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* QR simulación */}
      {showQR && (
        <div className={`fixed inset-0 ${overlayBg} z-[120] flex items-center justify-center transition-colors`}>
          <div className={`${modalBg} rounded-2xl p-8 flex flex-col items-center ${cardShadow} border ${modalBorder} transition-colors`}>
            <QRDisplay value={`pago-${Date.now()}`} size={180} />
            <div className={`mt-4 text-lg font-bold ${modalText}`}>Escanea para pagar</div>
            <div className={`mt-2 ${getThemeClass({dark:'text-zinc-500',light:'text-yellow-800'})}`}>Simulando pago QR...</div>
          </div>
        </div>
      )}
      {/* Ticket visual */}
      {ticket && (
        <div className={`fixed inset-0 ${overlayBg} z-[100] flex items-center justify-center print:bg-transparent print:relative print:inset-0 transition-colors`}>
          <div className={`ticket-print-area ${modalBg} ${cardShadow} border ${modalBorder} rounded-lg p-8 w-96 mx-auto relative print:shadow-none print:bg-white print:text-black transition-colors`}>
            <button className="absolute top-3 right-3 text-zinc-400 hover:text-black print:hidden" onClick={() => setTicket(null)}>×</button>
            <h2 className="text-xl font-bold mb-2 text-center">Ticket #{ticket.ticket_id || ticket.id}</h2>
            <div className="mb-2 text-center text-zinc-500 text-sm">{new Date(ticket.date).toLocaleString('es-ES')}</div>
            <div className="mb-4">
              {ticket.products.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span>${ticket.total.toFixed(2)}</span>
            </div>
            <div className="mt-6 flex justify-center print:hidden">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow transition-colors"
                onClick={() => {
                  const ticketDiv = document.querySelector('.ticket-print-area');
                  if (!ticketDiv) return window.print();
                  const printWindow = window.open('', '', 'width=400,height=600');
                  if (!printWindow) return window.print();
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Ticket</title>
                        <style>
                          body { font-family: sans-serif; margin: 0; padding: 0; background: #fff; color: #222; }
                          .ticket { max-width: 350px; margin: 0 auto; padding: 24px; border-radius: 16px; border: 1px solid #eee; box-shadow: 0 2px 8px #0001; }
                          .ticket h2 { text-align: center; margin-bottom: 8px; }
                          .ticket .productos { margin-bottom: 12px; }
                          .ticket .productos div { display: flex; justify-content: space-between; }
                          .ticket .total { border-top: 1px solid #ddd; margin-top: 12px; padding-top: 8px; font-weight: bold; display: flex; justify-content: space-between; }
                          .ticket .fecha { text-align: center; color: #888; font-size: 13px; margin-bottom: 10px; }
                        </style>
                      </head>
                      <body onload="window.print();window.close();">
                        <div class="ticket">
                          ${ticketDiv.innerHTML}
                        </div>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
              >
                Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Animación de éxito */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center z-[110] pointer-events-none">
          <div className="text-7xl animate-bounce">🎉</div>
        </div>
      )}
      {/* Animación al agregar producto */}
      {showAddAnim && (
        <div className="fixed inset-0 flex items-end justify-center z-[120] pointer-events-none">
          <div className="mb-32 text-6xl animate-bounce">🛒</div>
        </div>
      )}
      {/* ...existing code... */}
    </main>
  </>);
}
