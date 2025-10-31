"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
// import { useSearchParams } from 'next/navigation'; // handle Stripe redirect - DESHABILITADO 
import type { Product } from '../types/product';
import type { Sale, SaleProduct } from '../types/sale';
import type { Category } from '../types/category';
import { Boxes, ListOrdered, ShoppingCart, CheckCircle2, BarChart2, PieChart, Zap, HelpCircle, CreditCard } from 'lucide-react';

import { useProductsContext } from '../components/ProductsProvider';
import { ProductCard } from '../components/ProductCard';
import EditProductModal from '../components/EditProductModal';
import { useCart } from '../hooks/useCart';
import { createSale } from '../lib/sales';
import { supabase } from '../lib/supabaseClient';
import UserSettingsManager from '../lib/userSettings';
import { verifyDatabase } from '../lib/databaseDiagnostic';
import { AddProductForm } from '../components/AddProductForm';
import { CategoryFilter } from '../components/CategoryFilter';
import { AdminPanel } from '../components/AdminPanel';
import { SalesHistory } from '../components/SalesHistory';
import { StripePayment } from '../components/StripePayment_new';
import { useCategories } from '../hooks/useCategories';
import { ProductSearch } from '../components/ProductSearch';
import { DatabaseStatus } from '../components/DatabaseStatus';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StripeConfigManager } from '../lib/stripe-config';
import { User } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import { Modal } from '../components/Modal';
import { PaymentNotifications } from '../components/PaymentNotifications';


// ...existing code...


type ViewType = 'home' | 'admin' | 'sales' | 'reports' | 'stats' | 'shortcuts' | 'help';

interface HomeProps {
  preSelectedClient?: any;
}

function HomeComponent({ preSelectedClient = null }: HomeProps) {
  // Estado para el usuario autenticado - Consolidado en una sola variable
  type LocalUser = { id: string; email?: string };
  const [user, setUser] = useState<LocalUser | null>(null);
  // Estado para superusuario (solo una vez)
  const [isSuperuser, setIsSuperuser] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('superusers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      setIsSuperuser(!!data && !error);
    })();
  }, [user]);
  // const searchParams = useSearchParams();
  // const sessionIdParam = searchParams.get('session_id');

  // Handle Stripe checkout redirect - DESHABILITADO: ahora se maneja en /payment/success
  // useEffect(() => {
  //   if (sessionIdParam) {
  //     handleStripePaymentSuccess(sessionIdParam);
  //     // Remove the param from URL
  //     window.history.replaceState({}, '', window.location.pathname);
  //   }
  // }, [sessionIdParam]);

  // Listener para mensajes de la ventana de pago
  useEffect(() => {
    console.log('🔗 Configurando listener de mensajes para comunicación cross-window...');
    
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Mensaje recibido:', event.data);
      console.log('📍 Origen del mensaje:', event.origin);
      console.log('📍 Origen esperado:', window.location.origin);
      
      // Verificar origen por seguridad
      if (event.origin !== window.location.origin) {
        console.warn('⚠️ Mensaje bloqueado por origen diferente:', event.origin, 'vs esperado:', window.location.origin);
        return;
      }

      if (event.data.type === 'STRIPE_PAYMENT_SUCCESS') {
        console.log('🎉 Mensaje de éxito recibido de ventana de pago:', event.data);
        
        // Verificar si ya procesamos este pago
        if (event.data.sessionId && processedPayments.has(event.data.sessionId)) {
          console.log('⚠️ Pago ya procesado, ignorando:', event.data.sessionId);
          return;
        }
        
        // Procesar el pago exitoso en la pestaña principal
        if (event.data.sessionId) {
          // Marcar como procesado
          setProcessedPayments(prev => new Set(prev).add(event.data.sessionId));
          
          // SIEMPRE usar la función simple que solo abre ticket y procesa en background
          console.log('🎫 Mostrando ticket para pago:', event.data.sessionId);
          handleStripePaymentSuccessWithTicket(event.data.sessionId);
        }
      } else if (event.data.type === 'TICKET_CLOSED') {
        console.log('🔄 Ticket cerrado - Refrescando página:', event.data);
        // Actualizar el estado para refrescar la interfaz
        setView('home');
        setSalesRefreshTrigger(prev => prev + 1);
        
        // IMPORTANTE: Refrescar productos también
        console.log('🔄 Refrescando productos después de cerrar ticket...');
        fetchProducts();
        
        console.log('✅ Página refrescada después de cerrar ticket');
      } else if (event.data.type === 'PAYMENT_COMPLETED_FROM_QR') {
        console.log('📱 Pago QR completado desde dispositivo externo:', event.data);
        
        // Verificar si ya procesamos este pago
        if (event.data.sessionId && processedPayments.has(event.data.sessionId)) {
          console.log('⚠️ Pago QR ya procesado, ignorando:', event.data.sessionId);
          return;
        }
        
        // Para pagos QR desde dispositivos externos, procesar el pago Y vaciar carrito
        if (event.data.sessionId) {
          // Marcar como procesado
          setProcessedPayments(prev => new Set(prev).add(event.data.sessionId));
          
          console.log('🎫 ✅ PROCESANDO PAGO QR - Vaciando carrito y actualizando historial:', event.data.sessionId);
          
          // Limpiar carrito inmediatamente para QR
          clearCart();
          setShowStripePayment(false);
          setView('home');
          
          // Mostrar mensaje de éxito
          setToast({ type: 'success', message: '¡Pago QR procesado exitosamente! El ticket se mostró en el dispositivo del cliente.' });
          
          // Refrescar historial de ventas
          setSalesRefreshTrigger(prev => prev + 1);
        }
      } else if (event.data.type === 'STRIPE_PAYMENT_COMPLETE_CLOSE') {
        // El usuario cerró la ventana de éxito - limpiar y actualizar
        console.log('📨 Recibido mensaje de cierre de ventana de éxito');
        
        // Verificar si ya procesamos el cierre para evitar múltiples limpiezas
        const closeKey = `close_${event.data.sessionId || Date.now()}`;
        if (processedPayments.has(closeKey)) {
          console.log('⚠️ Cierre ya procesado, ignorando');
          return;
        }
        setProcessedPayments(prev => new Set(prev).add(closeKey));
        
        // Limpiar carrito inmediatamente
        console.log('🧹 Limpiando carrito después del pago con link...');
        clearCart();
        
        // Limpiar cualquier estado residual
        setTicket(null);
        setShowStripePayment(false);
        setView('home');
        
        // Refrescar historial de ventas
        setSalesRefreshTrigger(prev => prev + 1);
        
        // Recargar productos frescos
        console.log('🔄 Recargando productos...');
        try {
          fetchProducts();
          setToast({ type: 'success', message: '¡Pago completado! Carrito limpiado y datos actualizados.' });
        } catch (error) {
          console.error('Error recargando productos:', error);
        }
        
        if (event.data.action === 'reload_and_home') {
          // Recargar la página completa solo si se solicita específicamente
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    // Listener para mensajes CustomEvent (QR directo)
    // Solo permitir una ventana de ticket QR por sessionId
    let qrTicketWindowRef: Window | null = null;
    const handleCustomEvent = (event: CustomEvent) => {
      console.log('📱 Evento personalizado QR recibido:', event.detail);
      if (event.detail && event.detail.type === 'QR_PAYMENT_COMPLETED') {
        console.log('🎫 ✅ PROCESANDO EVENTO QR DIRECTO:', event.detail);
        const processKey = `qr_${event.detail.sessionId}`;
        if (event.detail.sessionId && processedPayments.has(processKey)) {
          console.log('⚠️ Pago QR ya procesado, ignorando evento duplicado:', event.detail.sessionId);
          return;
        }
        // Marcar como procesado inmediatamente
        if (event.detail.sessionId) {
          setProcessedPayments(prev => {
            const newSet = new Set(prev);
            newSet.add(processKey);
            newSet.add(event.detail.sessionId);
            return newSet;
          });
        }
        // Abrir solo una ventana de ticket QR por sessionId
        const ticketUrl = `${window.location.origin}/payment-success.html?session_id=${event.detail.sessionId}`;
        if (!qrTicketWindowRef || qrTicketWindowRef.closed) {
          qrTicketWindowRef = window.open(ticketUrl, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
          if (qrTicketWindowRef) {
            console.log('✅ Ventana de ticket QR abierta exitosamente');
          } else {
            console.warn('⚠️ No se pudo abrir la ventana del ticket - posible bloqueo de popups');
            setToast({ type: 'warning', message: 'Permite popups para ver el ticket de compra QR' });
          }
        } else {
          qrTicketWindowRef.focus();
          console.log('🔄 Ticket QR ya abierto, trayendo al frente');
        }
        clearCart();
        setShowStripePayment(false);
        setView('home');
        setToast({ type: 'success', message: '¡Pago QR procesado exitosamente! Ticket abierto en nueva ventana.' });
        setSalesRefreshTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('qr-payment-completed', handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('qr-payment-completed', handleCustomEvent as EventListener);
    };
  }, []);

  
  // Estado para el usuario autenticado - Consolidado en una sola variable
  
  
  // Control de pagos procesados para evitar duplicados
  const [processedPayments, setProcessedPayments] = useState<Set<string>>(new Set());
  
  // Estado para Stripe Connect
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{
    connected: boolean;
    loading: boolean;
    account?: any;
    stats?: any;
    error?: string;
  }>({ connected: false, loading: true });
  
  // Obtener usuario autenticado y suscribirse a cambios de sesión SOLO UNA VEZ
  const { setTheme: setThemeContext } = useTheme();
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const initAuth = async () => {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ? { id: user.id, email: user.email } : null);
      // Forzar dark si no hay preferencia guardada
      if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
          setThemeContext('dark');
        }
      }
      // Suscribirse a cambios de sesión
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('theme');
          if (!savedTheme) {
            setThemeContext('dark');
          }
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    };
    initAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setThemeContext]);

  // Verificar estado de Stripe Connect cuando el usuario cambie
    useEffect(() => {
      let timeoutId: NodeJS.Timeout | undefined;
      const checkStripeConnectStatus = async () => {
        if (!user) {
          setStripeConnectStatus({ connected: false, loading: false });
          return;
        }
        try {
          const response = await fetch('/api/stripe-connect/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          });
          const data = await response.json();
          if (response.ok && data.connected) {
            setStripeConnectStatus({
              connected: true,
              loading: false,
              account: data.account,
              stats: data.stats,
            });
            // Si venimos del onboarding, forzar recarga de productos y home
            if (window.location.pathname.includes('/onboarding/complete')) {
              setView('home');
              fetchProducts();
              setTimeout(() => window.location.replace('/'), 500);
            }
          } else if (data.error === 'database_not_setup') {
            setStripeConnectStatus({ connected: false, loading: false, error: 'Database not setup' });
            return;
          } else {
            setStripeConnectStatus({ connected: false, loading: false });
          }
        } catch (error) {
          setStripeConnectStatus({ connected: false, loading: false });
        }
      };
      checkStripeConnectStatus();
      return () => { if (timeoutId) clearTimeout(timeoutId); };
    }, [user]);

  // Refrescar estado cuando la página se vuelva visible (cuando regrese de otra página)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 Página visible - Refrescando estado de Stripe Connect...');
        // Re-verificar estado de Stripe Connect
        const checkStripeConnectStatus = async () => {
          try {
            const response = await fetch('/api/stripe-connect/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            });
            const data = await response.json();

            if (response.ok && data.connected) {
              setStripeConnectStatus({
                connected: true,
                loading: false,
                account: data.account,
                stats: data.stats,
              });
            } else {
              setStripeConnectStatus({ connected: false, loading: false });
            }
          } catch (error) {
            console.error('Error refrescando Stripe Connect:', error);
          }
        };
        checkStripeConnectStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);
  // --- Estado y lógica para edición de producto ---
  type EditProductType = { id: string; name: string; price: number; category: string } | null;
  const [editProduct, setEditProduct] = useState<EditProductType>(null);
  const [editValues, setEditValues] = useState<{ name: string; price: string; category: string }>({ name: '', price: '', category: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

function openEditProduct(product: Product) {
    setEditProduct(product);
    setEditValues({
      name: product.name,
      price: product.price ? product.price.toString() : '',
      category: product.category || ''
    });
    setEditError('');
    setEditSuccess(false);
  }

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
  // Función para recargar productos manualmente
  const handleManualReload = async () => {
    console.log('🔄 Recarga manual solicitada por usuario');
    setToast({ type: 'success', message: 'Recargando página...' });
    
    try {
      // Resetear estados PERO NO PONER isInitialLoad en true para evitar pantalla de carga infinita
      setView('home');
      
      // Recargar productos
      console.log('🔄 Recargando productos...');
      await fetchProducts();
      
      // Recargar categorías si es necesario
      setSelectedCategory('');
      setSearchTerm('');
      
      // Refrescar historial de ventas
      setSalesRefreshTrigger(prev => prev + 1);
      
      // Limpiar carrito si tiene contenido
      if (cart.length > 0) {
        clearCart();
      }
      
      setToast({ type: 'success', message: '✅ Página recargada exitosamente' });
      console.log('✅ Recarga manual completada');
    } catch (error) {
      console.error('❌ Error en recarga manual:', error);
      setToast({ type: 'error', message: 'Error al recargar. Intenta de nuevo.' });
    }
  };
const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0); // Para refrescar el historial de ventas
const [stripeConfigured, setStripeConfigured] = useState<boolean>(true); // Hardcodeado - plataforma ya configurada

  // Mostrar mensaje de verificación exitosa si corresponde
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      setShowVerificationSuccess(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, '', window.location.pathname);
      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => setShowVerificationSuccess(false), 5000);
    }
    // Stripe ya está configurado - no necesita verificación
  }, []);
  const [view, setView] = useState<ViewType>('home');
  const [faqAbierta, setFaqAbierta] = useState<string | null>(null);
  const [reportes, setReportes] = useState<{ 
    totalVentas: number; 
    cantidadTickets: number; 
    promedio: number;
    ventasDelDia: number;
    ventasDelMes: number;
  } | null>(null);

  // Lógica para reportes y ventas (sistema híbrido Supabase + localStorage)
  const [ventas, setVentas] = useState<Sale[]>([]);
  useEffect(() => {
    if (view === 'sales' || view === 'reports') {
      (async () => {
        let allSales: any[] = [];
        
        // PASO 1: Cargar desde Supabase si hay usuario autenticado
        if (user) {
          console.log('🔎 Consultando ventas en Supabase para user_id:', user.id);
          const { data, error } = await supabase
            .from('sales')
            .select('id, user_id, total, created_at, ticket_id, products, subtotal, discount_amount, payment_method, payment_status, stripe_payment_intent_id, status, updated_at, metadata')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Mostrar los user_id de las ventas para depuración
            console.log('📊 Ventas cargadas desde Supabase:', data.length, data.map(s => s.user_id));
            allSales = data.map((sale) => ({
              id: sale.id,
              user_id: sale.user_id,
              total: Number(sale.total) || 0,
              created_at: sale.created_at,
              ticket_id: sale.ticket_id,
              products: sale.products || [],
              subtotal: Number(sale.subtotal) || 0,
              discount_amount: Number(sale.discount_amount) || 0,
              payment_method: sale.payment_method || '',
              payment_status: sale.payment_status || '',
              status: sale.status || '',
              stripe_payment_intent_id: sale.stripe_payment_intent_id,
              updated_at: sale.updated_at,
              metadata: sale.metadata,
              source: 'supabase'
            }));
          } else if (error) {
            console.error('❌ Error cargando desde Supabase:', error);
          }
        }

        // PASO 2: Cargar también desde localStorage (como respaldo y datos adicionales)
        try {
          const localSales = JSON.parse(localStorage.getItem('sales') || '[]');
          // Filtrar solo ventas del usuario autenticado
          const localSalesForUser = user ? localSales.filter((sale: any) => sale.user_id === user.id) : [];
          console.log('💾 Ventas cargadas desde localStorage para este usuario:', localSalesForUser.length);

          // Agregar ventas de localStorage que no estén ya en Supabase
          const supabaseIds = allSales.map(sale => sale.id);
          const localOnlySales = localSalesForUser
            .filter((localSale: any) => !supabaseIds.includes(localSale.id))
            .map((localSale: any) => ({
              ...localSale,
              source: 'localStorage'
            }));

          console.log('💾 Ventas únicas de localStorage para este usuario:', localOnlySales.length);
          allSales = [...allSales, ...localOnlySales];
        } catch (error) {
          console.warn('⚠️ Error leyendo localStorage:', error);
        }

        // PASO 3: Eliminar duplicados por ticket_id o stripe_payment_intent_id
        const uniqueSalesMap = new Map();
        for (const sale of allSales) {
          const key = sale.stripe_payment_intent_id || sale.ticket_id || sale.id;
          if (!uniqueSalesMap.has(key)) {
            uniqueSalesMap.set(key, sale);
          }
        }
        const uniqueSales = Array.from(uniqueSalesMap.values());
        // Ordenar por fecha (más recientes primero)
        uniqueSales.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        console.log('📊 TOTAL VENTAS ÚNICAS:', uniqueSales.length);
        // Actualizar estado
        setVentas(uniqueSales);
        // PASO 4: Calcular reportes combinados
        if (view === 'reports' && uniqueSales.length > 0) {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const thisMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
          const totalVentas = uniqueSales.reduce((sum: number, sale) => sum + (Number(sale.total) || 0), 0);
          const cantidadTickets = uniqueSales.length;
          const promedio = cantidadTickets > 0 ? totalVentas / cantidadTickets : 0;
          const ventasHoy = uniqueSales.filter(sale => sale.created_at && sale.created_at.startsWith(todayStr));
          const totalHoy = ventasHoy.reduce((sum: number, sale) => sum + (Number(sale.total) || 0), 0);
          const ventasMes = uniqueSales.filter(sale => sale.created_at && sale.created_at.startsWith(thisMonth));
          const totalMes = ventasMes.reduce((sum: number, sale) => sum + (Number(sale.total) || 0), 0);
          setReportes({ 
            totalVentas, 
            cantidadTickets, 
            promedio,
            ventasDelDia: totalHoy,
            ventasDelMes: totalMes
          });
        } else if (view === 'reports') {
          setReportes({ 
            totalVentas: 0, 
            cantidadTickets: 0, 
            promedio: 0,
            ventasDelDia: 0,
            ventasDelMes: 0
          });
        }
      })();
    }
  }, [view, user, salesRefreshTrigger]);

  // Estado para el nombre del negocio editable - migrado a Supabase
  const [editingName, setEditingName] = useState(false);
  const [businessName, setBusinessName] = useState('Gestion de ventas V1');
  const [businessNameLoaded, setBusinessNameLoaded] = useState(false);
  
  useEffect(() => {
    const loadBusinessName = async () => {
      if (user && !businessNameLoaded) {
        const name = await UserSettingsManager.getBusinessName(user.id);
        setBusinessName(name);
        setBusinessNameLoaded(true);
      }
    };
    loadBusinessName();
  }, [user, businessNameLoaded]);
  
  const saveBusinessName = async (name: string) => {
    setEditingName(false);
    setBusinessName(name);
    if (user) {
      await UserSettingsManager.setBusinessName(user.id, name);
    }
  };

  // Función para iniciar el pago con Stripe
  // Bloqueo de ventas si no tiene Stripe Connect
  const [showStripeModal, setShowStripeModal] = useState(false);
  const handlePay = () => {
    if (!stripeConnectStatus.connected) {
      setShowStripeModal(true);
      return;
    }
    setShowStripePayment(true);
  };

  // Función para manejar éxito de pago de Stripe
  // Función auxiliar que procesa el pago y opcionalmente abre ticket externo
  // Evitar doble apertura de ticket
  // Solo permitir una ventana de ticket por sessionId de pago por link
  const ticketWindowRefs: { [sessionId: string]: Window | null } = {};
  const handleStripePaymentSuccessWithTicket = async (sessionId: string) => {
    console.log('🎫 Procesando pago de Stripe para abrir ticket externo:', sessionId);
    try {
      const ticketUrl = `${window.location.origin}/payment-success.html?session_id=${sessionId}`;
      // Si ya hay una ventana para este sessionId y está abierta, enfocar
      if (ticketWindowRefs[sessionId] && !ticketWindowRefs[sessionId]!.closed) {
        ticketWindowRefs[sessionId]!.focus();
        console.log('🔄 Ticket ya abierto para este pago, trayendo al frente');
      } else {
        // Abrir nueva ventana y guardar referencia
        ticketWindowRefs[sessionId] = window.open(ticketUrl, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
        if (ticketWindowRefs[sessionId]) {
          console.log('✅ Ventana de ticket abierta exitosamente');
        } else {
          console.warn('⚠️ No se pudo abrir la ventana - posible bloqueo de popups');
          setToast({ type: 'warning', message: 'Permite popups para ver el ticket de compra' });
        }
      }
      // Limpiar carrito y cerrar modal de pago
      clearCart();
      setShowStripePayment(false);
      setView('home');
      setToast({ type: 'success', message: '¡Pago procesado exitosamente! Ticket abierto en nueva ventana.' });
      setSalesRefreshTrigger(prev => prev + 1);
      fetchProducts();
      // Procesar la venta en segundo plano para guardarla en BD
      try {
        const simpleResponse = await fetch('/api/stripe/process-payment-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId, userId: user?.id })
        });
        const simpleResult = await simpleResponse.json();
        if (simpleResult.success) {
          setTimeout(() => {
            setSalesRefreshTrigger(prev => prev + 1);
            fetchProducts();
          }, 1000);
        } else {
          console.warn('⚠️ Problema procesando venta en segundo plano:', simpleResult.error);
        }
      } catch (error) {
        console.warn('⚠️ Error procesando venta en segundo plano (ticket ya mostrado):', error);
      }
    } catch (error) {
      console.error('❌ Error en handleStripePaymentSuccessWithTicket:', error);
      setToast({ type: 'error', message: 'Error procesando el pago: ' + (error instanceof Error ? error.message : 'Error desconocido') });
    }
  };

  const handleStripePaymentSuccess = async (sessionId: string) => {
    console.log('🎉 Pago Stripe exitoso, procesando...', { sessionId });
    
    setShowStripePayment(false);
    
    // Si no hay usuario, intentar obtener la sesión actual
    let currentUser = user;
    if (!currentUser?.id) {
      console.log('⏳ Usuario no disponible, obteniendo sesión actual...');
      try {
        // Intentar refrescar la sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ Error obteniendo sesión:', sessionError);
          // Intentar refrescar el token
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error('❌ Error refrescando sesión:', refreshError);
          } else if (refreshData?.session?.user) {
            currentUser = { id: refreshData.session.user.id, email: refreshData.session.user.email };
            setUser(currentUser);
            console.log('✅ Sesión refrescada exitosamente');
          }
        } else if (session?.user) {
          currentUser = { id: session.user.id, email: session.user.email };
          setUser(currentUser); // Actualizar el estado también
          console.log('✅ Usuario obtenido de sesión:', currentUser);
        }
      } catch (error) {
        console.error('❌ Error obteniendo sesión:', error);
      }
    }
    
    if (!currentUser?.id) {
      console.error('❌ Error: Usuario no autenticado después de reintentar');
      setToast({ type: 'error', message: 'Error: Usuario no autenticado' });
      return;
    }
    
    try {
      console.log('🔍 Obteniendo detalles de la sesión de Stripe:', sessionId);
      
      // Obtener los datos de la sesión de Stripe para recuperar la información original
      const response = await fetch('/api/stripe/payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: currentUser.id
        })
      });
      
      const stripeData = await response.json();
      console.log('📦 Datos de Stripe obtenidos:', stripeData);
      
      if (!stripeData.success) {
        throw new Error(stripeData.message || 'Error al verificar el pago con Stripe');
      }
      
      // Recuperar los datos originales de la sesión
      const { session_details } = stripeData;
      if (!session_details || !session_details.line_items) {
        throw new Error('No se pudieron recuperar los detalles de la compra');
      }
      
      // Construir los datos del carrito desde Stripe
      const stripeItems = session_details.line_items.map((lineItem: any) => {
        const priceInDollars = lineItem.price.unit_amount / 100; // Stripe usa centavos
        return {
          id: lineItem.price.product || `stripe_${Date.now()}_${Math.random()}`,
          name: lineItem.description || lineItem.price.product_data?.name || 'Producto',
          price: priceInDollars,
          original_price: priceInDollars, // Por ahora sin descuentos a nivel de item
          quantity: lineItem.quantity,
          category: '', // No disponible desde Stripe
          // Campos adicionales necesarios para CartItem
          user_id: currentUser.id,
          image_url: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stock_quantity: 999999, // Valor por defecto
          inactive: false
        };
      });
      
      const totalFromStripe = session_details.amount_total / 100; // Stripe usa centavos
      const subtotalFromStripe = session_details.amount_subtotal / 100;
      const discountFromStripe = subtotalFromStripe - totalFromStripe;
      
      console.log('💾 Creando venta con datos de Stripe:', { 
        items: stripeItems.length + ' items', 
        total: totalFromStripe, 
        userId: currentUser.id,
        paymentIntentId: session_details.payment_intent_id 
      });
      
      console.log('🎯 ANTES DE LLAMAR A createSale - Datos finales:');
      console.log('- stripeItems:', stripeItems);
      console.log('- totalFromStripe:', totalFromStripe);  
      console.log('- user.id:', currentUser.id);
      console.log('- selectedClient?.id:', selectedClient?.id || null);
      console.log('- payment_intent_id:', session_details.payment_intent_id);
      
      // Crear venta en la base de datos usando endpoint API
      console.log('🚀 CLIENT: Enviando datos a API para crear venta...');
      const createSaleResponse = await fetch('/api/create-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeItems,
          totalFromStripe,
          userId: currentUser.id,
          clientId: selectedClient?.id || undefined,
          paymentIntentId: session_details.payment_intent_id,
          metadata: {
            stripe_session_id: sessionId,
            customer_email: session_details.customer_email,
            platform: 'stripe_checkout'
          }
        })
      });
      
      const saleResult = await createSaleResponse.json();
      console.log('✅ CLIENT: Respuesta de API create-sale:', saleResult);
      
      if (!saleResult.success) {
        console.error('❌ CLIENT: Error en API create-sale:', saleResult.error);
        throw new Error('Error al crear la venta: ' + saleResult.error);
      } else {
        console.log('🎉 CLIENT: VENTA CREADA EXITOSAMENTE:', saleResult.data);
      }
      
      // Guardar también en localStorage como respaldo
      const saleForLocalStorage = {
        id: Date.now().toString(),
        ticket_id: sessionId,
        created_at: new Date().toISOString(),
        products: stripeItems,
        items: stripeItems,
        total: totalFromStripe,
        subtotal: subtotalFromStripe,
        discount: discountFromStripe,
        payment_method: 'stripe',
        payment_status: 'completed',
        status: 'completed',
        stripe_payment_intent_id: session_details.payment_intent_id,
        user_id: currentUser.id,
        metadata: {
          stripe_session_id: sessionId,
          customer_email: session_details.customer_email
        }
      };
      
      // Guardar en localStorage
      const existingLocalSales = JSON.parse(localStorage.getItem('sales') || '[]');
      
      // Verificar si ya existe esta venta para evitar duplicados
      const alreadyExists = existingLocalSales.some((sale: any) => 
        sale.stripe_payment_intent_id === session_details.payment_intent_id ||
        sale.ticket_id === sessionId
      );
      
      if (!alreadyExists) {
        existingLocalSales.push(saleForLocalStorage);
        localStorage.setItem('sales', JSON.stringify(existingLocalSales));
        console.log('💾 Venta también guardada en localStorage como respaldo');
      } else {
        console.log('⚠️ Venta ya existe en localStorage, evitando duplicado');
      }
      
      console.log('✅ Venta creada exitosamente en base de datos y localStorage');
      
      // **NUEVO: Procesar comisión para cuentas conectadas**
      try {
        console.log('💰 Procesando comisión para venta completada...');
        const commissionResponse = await fetch('/api/stripe-connect/process-commission', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
            stripePaymentIntentId: session_details.payment_intent_id,
            saleAmount: totalFromStripe,
            saleItems: stripeItems,
            customerEmail: session_details.customer_email
          })
        });

        const commissionResult = await commissionResponse.json();
        
        if (commissionResult.processed) {
          if (commissionResult.commission) {
            console.log('✅ Comisión procesada:', {
              amount: commissionResult.commission.amount,
              businessName: commissionResult.commission.businessName,
              rate: `${(commissionResult.commission.rate * 100)}%`
            });
            
            // Mostrar información de comisión al usuario
            if (!commissionResult.isDuplicate) {
              setToast({ 
                type: 'success', 
                message: `¡Comisión procesada! $${commissionResult.commission.amount} para ${commissionResult.commission.businessName}` 
              });
            }
          }
        } else {
          console.log('ℹ️ No hay cuenta conectada, procesando sin comisión');
        }
      } catch (commissionError) {
        console.error('⚠️ Error procesando comisión (continuando):', commissionError);
        // No interrumpir el flujo principal por errores de comisión
      }
      
      // Refrescar historial de ventas INMEDIATAMENTE
      console.log('🔄 Actualizando sales refresh trigger...');
      setSalesRefreshTrigger(prev => {
        const newValue = prev + 1;
        console.log('🔄 Sales refresh trigger actualizado de', prev, 'a', newValue);
        return newValue;
      });
      
      // También actualizar productos para que se muestren correctamente
      console.log('🔄 Refrescando productos después del pago...');
      await fetchProducts();

      // **LIMPIAR CARRITO DESPUÉS DEL PAGO EXITOSO**
      console.log('🧹 Limpiando carrito después del pago Link exitoso...');
      clearCart();

      // Para pagos desde QR externos, debemos mostrar el ticket aquí
      // porque el usuario está en la aplicación web principal
      return {
        success: true,
        saleData: saleForLocalStorage,
        shouldShowTicket: true // Indicar que se debe mostrar el ticket
      };
      
    } catch (error) {
      console.error('❌ Error al procesar pago:', error);
      setToast({ 
        type: 'error', 
        message: 'Error al procesar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido')
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };
  const { theme, setTheme: setThemeContext2, getThemeClass } = useTheme();
  // Resto de estados
  const { products, loading, setProducts, fetchProducts } = useProductsContext();

  // Modal de vinculación Stripe
  // Modal de vinculación Stripe: SIEMPRE tema dark, alto contraste y legibilidad
  const stripeModal = (
    <Modal open={showStripeModal} onClose={() => setShowStripeModal(false)} title="Vincula tu cuenta con Stripe">
      <div className="flex flex-col items-center gap-4 p-6 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl max-w-md mx-auto">
        <CreditCard className="w-14 h-14 mb-2 text-blue-400 drop-shadow-lg" />
        <h2 className="text-2xl font-extrabold mb-2 text-blue-300 text-center tracking-tight">Debes vincular tu cuenta con Stripe para poder cobrar</h2>
        <p className="text-center mb-4 text-zinc-200 text-base leading-relaxed">Configura tu cuenta de Stripe Connect para habilitar los cobros y recibir pagos de tus ventas.<br/>Es rápido, seguro y solo toma 2 minutos.</p>
        <a
          href="/stripe-connect-manual"
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          Vincular con Stripe
        </a>
        <button
          onClick={() => setShowStripeModal(false)}
          className="mt-3 text-blue-400 hover:underline text-base font-medium focus:outline-none"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
  const { categories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState('');
  const { cart, addToCart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCart, setShowCart] = useState(false); // Estado para mostrar/ocultar carrito móvil
  const [isMobile, setIsMobile] = useState(false); // Estado para detectar dispositivo móvil
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Estado para controlar la primera carga
  // Productos favoritos - migrado a Supabase
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  
  useEffect(() => {
    const loadFavorites = async () => {
      if (user && !favoritesLoaded) {
        const favorites = await UserSettingsManager.getFavoriteProducts(user.id);
        setFavoriteIds(favorites);
        setFavoritesLoaded(true);
      }
    };
    loadFavorites();
  }, [user, favoritesLoaded]);

  // Detectar tamaño de pantalla de forma segura
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Verificar al montar
    checkMobile();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [orderNote, setOrderNote] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [showAddAnim, setShowAddAnim] = useState(false);
const subtotal = cart.reduce((sum: number, item: Product & { quantity: number }) => sum + item.price * item.quantity, 0);
  const discountValue = discountType === 'amount' ? discount : Math.round((subtotal * discount) / 100);
  const total = Math.max(0, subtotal - discountValue);
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(preSelectedClient);
const [ticket, setTicket] = useState<{ 
  ticket_id?: string; 
  id?: string; 
  date: string | Date; 
  products: (Product & { quantity: number })[]; 
  total: number;
  subtotal?: number;
  discount?: number;
  created_at?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    original_price?: number;
    quantity: number;
  }>;
} | null>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  // Control de carga inicial de productos
  useEffect(() => {
    if (!loading && products.length >= 0) {
      // Una vez que termine la primera carga (exitosa o no), ya no es inicial
      setIsInitialLoad(false);
    }
  }, [loading, products]);

  // Timeout automático para la pantalla de carga inicial
  useEffect(() => {
    if (isInitialLoad && loading) {
      console.log('⏰ Iniciando timeout de 15 segundos para pantalla de carga');
      const timeoutId = setTimeout(() => {
        console.log('🚨 Timeout alcanzado - forzando salida de pantalla de carga');
        setIsInitialLoad(false);
        setToast({ 
          type: 'error', 
          message: 'La carga tomó demasiado tiempo. Usa el botón "Recargar productos" si es necesario.' 
        });
      }, 15000); // 15 segundos

      return () => {
        console.log('🔄 Limpiando timeout de pantalla de carga');
        clearTimeout(timeoutId);
      };
    }
  }, [isInitialLoad, loading]);


  // --- UTILIDADES VISUALES ---
  const bgMain = getThemeClass({ dark: 'bg-zinc-950', light: 'bg-white' });
  const textMain = getThemeClass({ dark: 'text-white', light: 'text-zinc-900' });
  const cardBg = getThemeClass({ dark: 'bg-zinc-900 border-zinc-800', light: 'bg-white border-zinc-200' });
  const cardShadow = getThemeClass({ dark: 'shadow-2xl', light: 'shadow-lg' });
  const btnBase = 'rounded-xl px-4 py-3 text-base sm:px-6 sm:py-4 sm:text-lg flex items-center gap-3 font-bold shadow transition-colors border duration-200';
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



  // --- BLOQUE DE VISTAS CONDICIONALES ---
  // (debe ir después de todos los hooks y utilidades, antes del return principal)
  // Secciones protegidas: solo si hay usuario
  if (view === 'admin' && user) {
    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        {stripeModal}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-2 sm:gap-0">
          <h1 className={`text-3xl font-bold text-yellow-400 flex items-center gap-3`}>
            <Boxes className="w-8 h-8 text-green-400" /> Administrar productos
          </h1>
          <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>🏠 Volver al inicio</button>
        </div>
        <div className={`mt-4 sm:mt-8 ${cardBg} ${cardShadow} rounded-2xl p-2 sm:p-8 border`}>
          <AdminPanel />
        </div>
      </main>
    );
  }
  if (view === 'sales' && user) {
    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-2 sm:gap-0">
          <h1 className={`text-3xl font-bold text-blue-400 flex items-center gap-3`}>
            <ListOrdered className="w-8 h-8 text-blue-400" /> Historial de ventas
          </h1>
          <button onClick={() => setView('home')} className={`${btnBase} ${btnBack}`}>🏠 Volver al inicio</button>
        </div>
        <div className={`mt-4 sm:mt-8`}>
          <SalesHistory 
            userId={user?.id} 
            getThemeClass={getThemeClass} 
            refreshTrigger={salesRefreshTrigger}
          />
        </div>
      </main>
    );
  }
  if (view === 'reports' && user) {
    // Calcular métricas avanzadas
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.created_at || v.order_date || '');
      return fechaVenta.toDateString() === hoy.toDateString();
    });
    
    const ventasSemana = ventas.filter(v => {
      const fechaVenta = new Date(v.created_at || v.order_date || '');
      return fechaVenta >= inicioSemana;
    });
    
    const ventasMes = ventas.filter(v => {
      const fechaVenta = new Date(v.created_at || v.order_date || '');
      return fechaVenta >= inicioMes;
    });

    const totalHoy = ventasHoy.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalSemana = ventasSemana.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalMes = ventasMes.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalGeneral = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    
    const ticketPromedio = ventas.length > 0 ? totalGeneral / ventas.length : 0;
    const crecimientoDiario = ventasHoy.length > 0 ? ((totalHoy / (totalSemana / 7)) - 1) * 100 : 0;

    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <BarChart2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
            <h1 className="text-4xl font-bold text-purple-500 mb-2">📊 Reportes Avanzados</h1>
            <p className="text-lg text-purple-300">Dashboard completo de métricas de negocio</p>
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-blue-900 to-blue-800',light:'bg-gradient-to-br from-blue-50 to-blue-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-300">VENTAS HOY</h3>
                <div className="text-2xl">📈</div>
              </div>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-200">{formatCurrency(totalHoy)}</div>
              <div className="text-sm text-blue-500 mt-1">{ventasHoy.length} transacciones</div>
            </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-green-900 to-green-800',light:'bg-gradient-to-br from-green-50 to-green-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-300">ESTA SEMANA</h3>
                <div className="text-2xl">🗓️</div>
              </div>
              <div className="text-3xl font-bold text-green-700 dark:text-green-200">{formatCurrency(totalSemana)}</div>
              <div className="text-sm text-green-500 mt-1">{ventasSemana.length} transacciones</div>
            </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-purple-900 to-purple-800',light:'bg-gradient-to-br from-purple-50 to-purple-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-300">ESTE MES</h3>
        <div className="text-2xl">📅</div>
      </div>
      <div className="text-3xl font-bold text-purple-700 dark:text-purple-200">{formatCurrency(totalMes)}</div>
      <div className="text-sm text-purple-500 mt-1">{ventasMes.length} transacciones</div>
      {/* cierre correcto del bloque, sin div extra */}
    </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-orange-900 to-orange-800',light:'bg-gradient-to-br from-orange-50 to-orange-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-300">TICKET PROMEDIO</h3>
                <div className="text-2xl">🎯</div>
              </div>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-200">{formatCurrency(ticketPromedio)}</div>
              <div className="text-sm text-orange-500 mt-1">Por transacción</div>
            </div>
          </div>

          {/* Análisis de rendimiento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-purple-500 mb-4 flex items-center gap-2">
                <div className="text-2xl">⚡</div>
                Rendimiento del Negocio
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Total de Ventas:</span>
                  <span className="font-bold text-2xl text-purple-500">{formatCurrency(totalGeneral)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Total de Transacciones:</span>
                  <span className="font-bold text-xl text-blue-500">{ventas.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Promedio por Día:</span>
                  <span className="font-bold text-xl text-green-500">{formatCurrency(totalGeneral / 30)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Tendencia Diaria:</span>
                  <span className={`font-bold text-xl ${crecimientoDiario >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {crecimientoDiario >= 0 ? '📈' : '📉'} {Math.abs(crecimientoDiario).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-purple-500 mb-4 flex items-center gap-2">
                <div className="text-2xl">🏆</div>
                Objetivos y Metas
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-300">Meta Mensual</span>
                    <span className="text-sm text-gray-500">70%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" style={{width: '70%'}}></div>
                  </div>
                  <div className="text-right text-sm text-purple-500 mt-1">{formatCurrency(totalMes)} / {formatCurrency(50000)}</div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-300">Meta Semanal</span>
                    <span className="text-sm text-gray-500">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{width: '85%'}}></div>
                  </div>
                  <div className="text-right text-sm text-green-500 mt-1">{formatCurrency(totalSemana)} / {formatCurrency(12000)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => setView('home')} className={`${btnBase} ${btnBack} mt-8`}>
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
  if (view === 'stats' && user) {
    // Estadísticas avanzadas: análisis profundo de productos y categorías
    const ventasPorProducto: Record<string, { producto: SaleProduct, cantidad: number, ingresos: number }> = {};
    ventas.forEach((venta: Sale) => {
      if (Array.isArray(venta.products)) {
        venta.products.forEach((item: SaleProduct) => {
          if (!ventasPorProducto[item.id]) {
            ventasPorProducto[item.id] = { producto: item, cantidad: 0, ingresos: 0 };
          }
          ventasPorProducto[item.id].cantidad += item.quantity || 1;
          ventasPorProducto[item.id].ingresos += (item.price || 0) * (item.quantity || 1);
        });
      }
    });

    const topProducts = Object.values(ventasPorProducto)
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 8);

    const ventasPorCategoria: Record<string, { cantidad: number, ingresos: number }> = {};
    Object.values(ventasPorProducto).forEach(({ producto, cantidad, ingresos }) => {
      let catName = 'Sin categoría';
      if (producto.category) {
        const catObj = categories.find((c: Category) => c.id === producto.category || c.name === producto.category);
        catName = catObj?.name || producto.category;
      }
      if (!ventasPorCategoria[catName]) {
        ventasPorCategoria[catName] = { cantidad: 0, ingresos: 0 };
      }
      ventasPorCategoria[catName].cantidad += cantidad;
      ventasPorCategoria[catName].ingresos += ingresos;
    });

    const maxIngresosCat = Math.max(...Object.values(ventasPorCategoria).map(v => v.ingresos), 1);
    const totalProductos = products.length;
    const productosVendidos = Object.keys(ventasPorProducto).length;
    const tasaRotacion = totalProductos > 0 ? (productosVendidos / totalProductos) * 100 : 0;

    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <PieChart className="w-16 h-16 text-pink-400 mx-auto mb-4 animate-spin-slow" />
            <h1 className="text-4xl font-bold text-pink-500 mb-2">📊 Estadísticas Avanzadas</h1>
            <p className="text-lg text-pink-300">Análisis profundo de rendimiento de productos</p>
          </div>

          {/* KPIs principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-pink-900 to-rose-800',light:'bg-gradient-to-br from-pink-50 to-rose-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-pink-600 dark:text-pink-300">PRODUCTOS ACTIVOS</h3>
                <div className="text-2xl">📦</div>
              </div>
              <div className="text-3xl font-bold text-pink-700 dark:text-pink-200">{productosVendidos}</div>
              <div className="text-sm text-pink-500 mt-1">de {totalProductos} total</div>
            </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-indigo-900 to-blue-800',light:'bg-gradient-to-br from-indigo-50 to-blue-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">TASA ROTACIÓN</h3>
                <div className="text-2xl">🔄</div>
              </div>
              <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-200">{tasaRotacion.toFixed(1)}%</div>
              <div className="text-sm text-indigo-500 mt-1">productos vendidos</div>
            </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-emerald-900 to-green-800',light:'bg-gradient-to-br from-emerald-50 to-green-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">CATEGORÍAS ACTIVAS</h3>
                <div className="text-2xl">🏷️</div>
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-200">{Object.keys(ventasPorCategoria).length}</div>
              <div className="text-sm text-emerald-500 mt-1">categorías</div>
            </div>

            <div className={`${getThemeClass({dark:'bg-gradient-to-br from-amber-900 to-yellow-800',light:'bg-gradient-to-br from-amber-50 to-yellow-100'})} rounded-2xl p-6 border shadow-lg`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-300">MEJOR PRODUCTO</h3>
                <div className="text-2xl">🏆</div>
              </div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-200">
                {topProducts[0]?.producto?.name || 'N/A'}
              </div>
              <div className="text-sm text-amber-500 mt-1">
                {topProducts[0] ? formatCurrency(topProducts[0].ingresos) : '0'}
              </div>
            </div>
          </div>

          {/* Análisis detallado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top productos */}
            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-pink-500 mb-6 flex items-center gap-2">
                <div className="text-2xl">🎯</div>
                Top Productos por Ingresos
              </h3>
              {topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-gray-500">No hay datos de ventas disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((prod, idx) => (
                    <div key={`top-product-${idx}-${typeof prod.producto.id === 'string' ? prod.producto.id : `product-${idx}`}`} className={`p-3 rounded-xl ${getThemeClass({dark:'bg-pink-900/20 border border-pink-800',light:'bg-pink-50 border border-pink-200'})}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-white' :
                            idx === 1 ? 'bg-gray-400 text-white' :
                            idx === 2 ? 'bg-orange-500 text-white' : 
                            'bg-pink-500 text-white'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {prod.producto.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {prod.cantidad} unidades vendidas
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-pink-500">
                            {formatCurrency(prod.ingresos)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(prod.ingresos / prod.cantidad)} c/u
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ventas por categoría */}
            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-pink-500 mb-6 flex items-center gap-2">
                <div className="text-2xl">📊</div>
                Rendimiento por Categoría
              </h3>
              {Object.keys(ventasPorCategoria).length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-500">No hay categorías con ventas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(ventasPorCategoria)
                    .sort((a, b) => b[1].ingresos - a[1].ingresos)
                    .map(([catName, data], idx) => (
                      <div key={`categoria-${idx}-${catName.replace(/[^a-zA-Z0-9]/g, '-')}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {catName}
                          </span>
                          <span className="text-pink-500 font-bold">
                            {formatCurrency(data.ingresos)}
                          </span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-pink-500 to-rose-500 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${(data.ingresos / maxIngresosCat) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{data.cantidad} productos</span>
                            <span>{((data.ingresos / maxIngresosCat) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => setView('home')} className={`${btnBase} ${btnBack} mt-8`}>
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
  if (view === 'shortcuts' && user) {
    // Atajos rápidos profesionales: herramientas de productividad avanzadas
    const favoritos = products.filter((p: Product) => favoriteIds.includes(p.id));
    const productosPopulares = products.slice(0, 6); // Top productos
    
    // Atajos de descuento predefinidos
    const descuentosRapidos = [
      { valor: 5, label: '5%', emoji: '🎯', desc: 'Descuento básico' },
      { valor: 10, label: '10%', emoji: '🎪', desc: 'Cliente frecuente' },
      { valor: 15, label: '15%', emoji: '🎊', desc: 'Promoción especial' },
      { valor: 20, label: '20%', emoji: '🎁', desc: 'Descuento premium' },
      { valor: 25, label: '25%', emoji: '💎', desc: 'VIP' },
      { valor: 50, label: '50%', emoji: '🏆', desc: 'Oferta flash' }
    ];

    // Acciones rápidas del sistema
    const accionesRapidas = [
      { 
        id: 'clear-cart',
        nombre: 'Limpiar Carrito',
        emoji: '🗑️',
        desc: 'Vaciar carrito actual',
        color: 'red',
        accion: () => clearCart()
      },
      {
        id: 'toggle-theme',
        nombre: 'Cambiar Tema',
        emoji: theme === 'dark' ? '☀️' : '🌙',
        desc: 'Modo claro/oscuro',
        color: 'indigo',
  accion: () => setThemeContext2(theme === 'dark' ? 'light' : 'dark')
      },
      {
        id: 'export-sales',
        nombre: 'Exportar Ventas',
        emoji: '📊',
        desc: 'Descargar historial',
        color: 'green',
        accion: () => {
          const csvContent = ventas.map(v => `${v.order_date || v.created_at},${v.total},${v.products?.length || 0}`).join('\n');
          const blob = new Blob([`Fecha,Total,Items\n${csvContent}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ventas.csv';
          a.click();
        }
      }
    ];

    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Zap className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-bounce" />
            <h1 className="text-4xl font-bold text-orange-500 mb-2">⚡ Atajos Profesionales</h1>
            <p className="text-lg text-orange-300">Centro de productividad y acciones rápidas</p>
          </div>

          {/* Descuentos rápidos */}
          <div className={`${cardBg} rounded-2xl p-6 border shadow-lg mb-6`}>
            <h3 className="text-xl font-bold text-orange-500 mb-6 flex items-center gap-2">
              <div className="text-2xl">💰</div>
              Descuentos Rápidos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {descuentosRapidos.map(desc => (
                <button 
                  key={desc.valor}
                  onClick={() => { setDiscountType('percent'); setDiscount(desc.valor); }}
                  className={`${getThemeClass({dark:'bg-gradient-to-br from-orange-900 to-red-800 hover:from-orange-800 hover:to-red-700 border-orange-700',light:'bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-orange-200'})} rounded-xl p-4 border transition-all duration-300 hover:scale-105 group`}
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                    {desc.emoji}
                  </div>
                  <div className="font-bold text-lg text-orange-600 dark:text-orange-300">
                    {desc.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {desc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Productos favoritos */}
            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-orange-500 mb-6 flex items-center gap-2">
                <div className="text-2xl">❤️</div>
                Productos Favoritos
              </h3>
              {favoritos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💫</div>
                  <p className="text-gray-500 mb-4">No tienes favoritos aún</p>
                  <p className="text-sm text-gray-400">Marca productos como favoritos desde la vista principal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoritos.slice(0, 4).map((prod: Product) => (
                    <div key={prod.id} className={`p-3 rounded-xl ${getThemeClass({dark:'bg-orange-900/20 border border-orange-800',light:'bg-orange-50 border border-orange-200'})} flex items-center justify-between`}>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {prod.name}
                        </div>
                        <div className="text-sm text-orange-500 font-bold">
                          {formatCurrency(prod.price)}
                        </div>
                      </div>
                      <button 
                        onClick={() => addToCart(prod)} 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 flex items-center gap-2"
                      >
                        ➕ Agregar
                      </button>
                    </div>
                  ))}
                  {favoritos.length > 4 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-gray-500">
                        +{favoritos.length - 4} favoritos más
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acciones rápidas del sistema */}
            <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
              <h3 className="text-xl font-bold text-orange-500 mb-6 flex items-center gap-2">
                <div className="text-2xl">🚀</div>
                Acciones Rápidas
              </h3>
              <div className="space-y-4">
                {accionesRapidas.map(accion => (
                  <button
                    key={accion.id}
                    onClick={accion.accion}
                    className={`w-full p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] flex items-center gap-4 ${
                      accion.color === 'red' ? getThemeClass({dark:'bg-red-900/20 border-red-800 hover:bg-red-900/30',light:'bg-red-50 border-red-200 hover:bg-red-100'}) :
                      accion.color === 'indigo' ? getThemeClass({dark:'bg-indigo-900/20 border-indigo-800 hover:bg-indigo-900/30',light:'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'}) :
                      getThemeClass({dark:'bg-green-900/20 border-green-800 hover:bg-green-900/30',light:'bg-green-50 border-green-200 hover:bg-green-100'})
                    }`}
                  >
                    <div className="text-3xl">{accion.emoji}</div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-gray-800 dark:text-gray-200">
                        {accion.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {accion.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Productos populares - acceso rápido */}
          <div className={`${cardBg} rounded-2xl p-6 border shadow-lg mb-6`}>
            <h3 className="text-xl font-bold text-orange-500 mb-6 flex items-center gap-2">
              <div className="text-2xl">🔥</div>
              Acceso Rápido - Productos Populares
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {productosPopulares.map((prod: Product) => (
                <button
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className={`${getThemeClass({dark:'bg-gradient-to-br from-purple-900 to-pink-800 hover:from-purple-800 hover:to-pink-700 border-purple-700',light:'bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200'})} rounded-xl p-4 border transition-all duration-300 hover:scale-105 group`}
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                    🍽️
                  </div>
                  <div className="font-semibold text-sm text-purple-600 dark:text-purple-300 mb-1 truncate">
                    {prod.name}
                  </div>
                  <div className="text-xs font-bold text-purple-500">
                    {formatCurrency(prod.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => setView('home')} className={`${btnBase} ${btnBack} mt-4`}>
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
  if (view === 'help' && user) {
    // Sistema de ayuda y soporte profesional
    const faqSections = [
      {
        categoria: 'Operaciones Básicas',
        emoji: '🛒',
        preguntas: [
          {
            pregunta: '¿Cómo agrego productos al carrito?',
            respuesta: 'Haz clic en el botón "Agregar" en la tarjeta del producto. También puedes usar los atajos rápidos para productos favoritos.'
          },
          {
            pregunta: '¿Cómo modifico la cantidad de un producto?',
            respuesta: 'En el carrito, usa los botones + y - junto a cada producto, o haz clic en la cantidad para editarla directamente.'
          },
          {
            pregunta: '¿Cómo elimino un producto del carrito?',
            respuesta: 'Haz clic en el ícono de basura (🗑️) junto al producto en el carrito, o reduce la cantidad a 0.'
          }
        ]
      },
      {
        categoria: 'Descuentos y Promociones',
        emoji: '💰',
        preguntas: [
          {
            pregunta: '¿Cómo aplico un descuento?',
            respuesta: 'Puedes aplicar descuentos desde: 1) El campo de descuento en el carrito, 2) Los atajos rápidos, o 3) Durante el proceso de pago.'
          },
          {
            pregunta: '¿Puedo aplicar múltiples descuentos?',
            respuesta: 'Solo se puede aplicar un descuento por venta. El último descuento aplicado reemplaza al anterior.'
          },
          {
            pregunta: '¿Cómo funcionan los descuentos por porcentaje vs. monto fijo?',
            respuesta: 'Los descuentos por porcentaje se calculan sobre el subtotal. Los montos fijos se restan directamente del total.'
          }
        ]
      },
      {
        categoria: 'Tickets y Ventas',
        emoji: '🧾',
        preguntas: [
          {
            pregunta: '¿Cómo imprimo un ticket?',
            respuesta: 'Después de completar la venta, aparecerá automáticamente la vista del ticket con el botón "Imprimir". También puedes acceder desde el historial.'
          },
          {
            pregunta: '¿Puedo reimprimir un ticket?',
            respuesta: 'Sí, ve a "Historial de Ventas", encuentra la venta y haz clic en "Ver ticket" para volver a imprimirla.'
          },
          {
            pregunta: '¿Dónde veo el historial completo?',
            respuesta: 'En el dashboard principal, haz clic en "📈 Historial de ventas" para ver todas las transacciones.'
          }
        ]
      }
    ];

    const caracteristicas = [
      { nombre: 'Gestión de Inventario', emoji: '📦', desc: 'Control completo de productos y categorías' },
      { nombre: 'Reportes Avanzados', emoji: '📊', desc: 'Análisis de ventas y rendimiento' },
      { nombre: 'Modo Móvil', emoji: '📱', desc: 'Interfaz optimizada para dispositivos móviles' },
      { nombre: 'Tema Oscuro/Claro', emoji: '🌗', desc: 'Personalización visual según preferencias' },
      { nombre: 'Códigos QR', emoji: '📲', desc: 'Compartir información de ventas fácilmente' },
      { nombre: 'Exportación de Datos', emoji: '💾', desc: 'Descarga reportes en formato CSV' }
    ];

    return (
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <HelpCircle className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" />
            <h1 className="text-4xl font-bold text-blue-500 mb-2">🆘 Centro de Ayuda</h1>
            <p className="text-lg text-blue-300">Soporte completo y guías de usuario</p>
          </div>

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* FAQ Principal */}
            <div className="lg:col-span-2">
              <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
                <h3 className="text-xl font-bold text-blue-500 mb-6 flex items-center gap-2">
                  <div className="text-2xl">❓</div>
                  Preguntas Frecuentes
                </h3>
                <div className="space-y-4">
                  {faqSections.map((seccion, idx) => (
                    <div key={idx} className={`border rounded-xl overflow-hidden ${getThemeClass({dark:'border-blue-800',light:'border-blue-200'})}`}>
                      <div className={`p-4 ${getThemeClass({dark:'bg-blue-900/30',light:'bg-blue-50'})}`}>
                        <h4 className="font-bold text-blue-600 dark:text-blue-300 flex items-center gap-2">
                          <span className="text-xl">{seccion.emoji}</span>
                          {seccion.categoria}
                        </h4>
                      </div>
                      <div className="divide-y divide-blue-200 dark:divide-blue-800">
                        {seccion.preguntas.map((faq, faqIdx) => {
                          const faqId = `${idx}-${faqIdx}`;
                          return (
                            <div key={faqIdx}>
                              <button
                                onClick={() => setFaqAbierta(faqAbierta === faqId ? null : faqId)}
                                className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between"
                              >
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {faq.pregunta}
                                </span>
                                <div className={`text-blue-500 transform transition-transform ${faqAbierta === faqId ? 'rotate-180' : ''}`}>
                                  ⬇️
                                </div>
                              </button>
                              {faqAbierta === faqId && (
                                <div className="px-4 pb-4">
                                  <div className={`p-3 rounded-lg ${getThemeClass({dark:'bg-blue-900/20',light:'bg-blue-50'})}`}>
                                    <p className="text-gray-700 dark:text-gray-300">
                                      {faq.respuesta}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel lateral */}
            <div className="space-y-6">
              {/* Contacto */}
              <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
                <h3 className="text-xl font-bold text-blue-500 mb-4 flex items-center gap-2">
                  <div className="text-2xl">📞</div>
                  Contacto
                </h3>
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg ${getThemeClass({dark:'bg-green-900/20 border border-green-800',light:'bg-green-50 border border-green-200'})}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">💬</span>
                      <span className="font-bold text-green-600 dark:text-green-400">WhatsApp</span>
                    </div>
                    <a 
                      href="https://wa.me/5491123456789" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-600 transition-colors font-semibold"
                    >
                      +54 9 11 2345-6789
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Respuesta inmediata</p>
                  </div>
                  
                  <div className={`p-3 rounded-lg ${getThemeClass({dark:'bg-blue-900/20 border border-blue-800',light:'bg-blue-50 border border-blue-200'})}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">📧</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">Email</span>
                    </div>
                    <a 
                      href="mailto:supporton@gmail.com"
                      className="text-blue-500 hover:text-blue-600 transition-colors font-semibold"
                    >
                      supporton@gmail.com
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Respuesta en 24h</p>
                  </div>
                </div>
              </div>

              {/* Características */}
              <div className={`${cardBg} rounded-2xl p-6 border shadow-lg`}>
                <h3 className="text-xl font-bold text-blue-500 mb-4 flex items-center gap-2">
                  <div className="text-2xl">✨</div>
                  Características
                </h3>
                <div className="space-y-3">
                  {caracteristicas.map((feat, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${getThemeClass({dark:'bg-purple-900/20 border border-purple-800',light:'bg-purple-50 border border-purple-200'})}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{feat.emoji}</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400 text-sm">
                          {feat.nombre}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-200">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className={`${cardBg} rounded-2xl p-6 border shadow-lg mb-6`}>
            <h3 className="text-xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <div className="text-2xl">ℹ️</div>
              Información del Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${getThemeClass({dark:'bg-indigo-900/20',light:'bg-indigo-50'})}`}>
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2">🚀 Versión</h4>
                <p className="text-lg font-mono">v1.0.0</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Sistema POS Profesional</p>
              </div>
              <div className={`p-4 rounded-lg ${getThemeClass({dark:'bg-emerald-900/20',light:'bg-emerald-50'})}`}>
                <h4 className="font-bold text-emerald-600 dark:text-emerald-400 mb-2">🛠️ Estado</h4>
                <p className="text-lg text-emerald-500 font-bold">● Operativo</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Todos los sistemas funcionando</p>
              </div>
              <div className={`p-4 rounded-lg ${getThemeClass({dark:'bg-amber-900/20',light:'bg-amber-50'})}`}>
                <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2">📊 Rendimiento</h4>
                <p className="text-lg text-amber-500 font-bold">Óptimo</p>
                <p className="text-xs text-gray-500 dark:text-gray-300">Sistema optimizado</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => setView('home')} className={`${btnBase} ${btnBack} mt-4`}>
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </main>
    );
  }
  // Vista principal
  return (
    <>
      <DatabaseStatus />
      {/* Pantalla de carga inicial completa */}
      {isInitialLoad && loading && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-2">
              <LoadingSpinner />
              <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                Gestion de ventas V1
              </div>
            </div>
            <p className={`text-lg ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
              Cargando productos...
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'} max-w-md text-center`}>
              Por favor espera mientras obtenemos el menú desde la base de datos
            </p>
            
            {/* Botón de recargar manual después de 8 segundos */}
            <div className="mt-8">
              <button
                onClick={handleManualReload}
                className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' 
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                } border-2`}
              >
                🔄 Recargar productos
              </button>
            </div>
            
            <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'} text-center max-w-sm`}>
              Si la carga toma demasiado tiempo, haz clic en "Recargar productos"
            </p>
          </div>
        </div>
      )}
      <title>Gestion de ventas V1</title>
      <main className={`min-h-screen ${bgMain} p-2 sm:p-8`}>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-8 gap-2 sm:gap-0">
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
        
        {/* Mensaje de verificación exitosa */}
        {showVerificationSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center animate-fade-in">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
              <h3 className="text-lg font-bold text-green-500">¡Cuenta verificada exitosamente!</h3>
            </div>
            <p className="text-green-400 text-sm">
              Tu email ha sido confirmado y tu cuenta está lista para usar. ¡Bienvenido a Gestión de Ventas V1!
            </p>
          </div>
        )}
        
        {/* Botones de navegación y modo */}
        {user && (
          <div className="flex flex-wrap gap-4 mb-10 items-center animate-fade-in">
            {/* Botón solo para superusuarios */}
            {isSuperuser && (
              <a
                href="/admin/commissions-summary"
                className={`${btnBase} bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-yellow-500 hover:from-yellow-600 hover:to-yellow-500 transition-transform hover:scale-105`}
                style={{ textDecoration: 'none' }}
              >
                <BarChart2 className="w-6 h-6 text-white" /> Resumen de Comisiones
              </a>
            )}
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
            
            {/* Stripe Connect Status */}
            {stripeConnectStatus.loading ? (
              <div className={`${btnBase} bg-gray-500 cursor-not-allowed opacity-75`}>
                <CreditCard className="w-6 h-6 animate-spin" /> ⏳ Verificando Stripe...
              </div>
            ) : stripeConnectStatus.connected ? (
              <div className="flex flex-col space-y-2">
                <div className={`${btnBase} bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-600`}>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">✅ Stripe Conectado</div>
                      <div className="text-xs opacity-90">
                        {stripeConnectStatus.account?.businessName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                <a 
                  href="/stripe-connect-manual" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`${btnBase} bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-blue-600 transition-transform hover:scale-105`}
                >
                  <CreditCard className="w-6 h-6" /> � Configurar Cuenta Stripe
                </a>
              </div>
            )}
            <button
              onClick={() => setThemeContext2(theme === 'dark' ? 'light' : 'dark')}
              className={`${btnBase} ${btnTheme} ml-4 transition-transform hover:scale-105`}
              aria-label="Toggle light/dark mode"
            >
              {theme === 'dark' ? '🌙 Modo oscuro' : '☀️ Modo claro'}
            </button>
            <button
              onClick={handleManualReload}
              className={`${btnBase} ${theme === 'dark' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border-zinc-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'} transition-transform hover:scale-105`}
              aria-label="Recargar página"
              title="Recargar productos y refrescar página"
            >
              🔄 Recargar
            </button>
          </div>
        )}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 items-start">
        <div className="flex-1">
          <>
            <h2 className={`text-2xl font-bold mb-6 ${textMain}`}>Menú de productos</h2>
            
            <ProductSearch onSearch={setSearchTerm} />
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6" role="list">
              {loading ? (
                <div className="col-span-full">
                  <div className={`flex flex-col items-center justify-center py-20 px-4 rounded-2xl ${theme === 'dark' ? 'bg-zinc-800/50' : 'bg-yellow-100/50'} border ${theme === 'dark' ? 'border-zinc-700' : 'border-yellow-200'}`}>
                    <LoadingSpinner />
                    <p className={`mt-4 text-lg font-medium ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Cargando productos...
                    </p>
                    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Por favor espera mientras obtenemos el menú
                    </p>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className={`col-span-full text-center ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>No hay productos disponibles.</div>
              ) : (
                <>
                  {(() => {
                    const filteredProducts = products.filter((product: Product) => {
                      if (selectedCategory === '') return true;
                      if (selectedCategory === 'none') return !product.category;
                      return product.category === selectedCategory;
                    }).filter((product: Product) =>
                      !searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    return filteredProducts.map((product: Product) => (
                      <div key={product.id} className={`relative group transition-all duration-200 ${product.inactive ? 'opacity-50 pointer-events-none' : ''}`} role="listitem">
                        <ProductCard product={product} onAdd={() => {
                          addToCart(product);
                          setShowAddAnim(true);
                          setTimeout(() => setShowAddAnim(false), 500);
                        }} getThemeClass={getThemeClass} categories={categories} />
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
                        {/* Botón favorito */}
                        <button
                          className={`absolute top-2 right-2 z-10 text-2xl ${favoriteIds.includes(product.id) ? 'text-yellow-400' : 'text-zinc-400 hover:text-yellow-400'} transition-colors focus:ring-2 focus:ring-yellow-400`}
                          onClick={async () => {
                            const updated = favoriteIds.includes(product.id)
                              ? favoriteIds.filter(id => id !== product.id)
                              : [...favoriteIds, product.id];
                            
                            setFavoriteIds(updated);
                            
                            if (user) {
                              await UserSettingsManager.setFavoriteProducts(user.id, updated);
                            }
                          }}
                          aria-label="Favorito"
                          tabIndex={0}
                          role="button"
                        >★</button>
                      </div>
                    ));
                  })()}
                  {editProduct && (
                    <EditProductModal
                      product={editProduct}
                      values={editValues}
                      onChange={handleEditChange}
                      onClose={() => setEditProduct(null)}
                      onSave={handleEditSave}
                      onDelete={async () => {
                        if (!editProduct) return;
                        if (!window.confirm('¿Eliminar este producto?')) return;
                        await supabase.from('products').delete().eq('id', editProduct.id);
                        setEditProduct(null);
                        if (typeof window !== 'undefined') window.location.reload();
                      }}
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
            <div className={`${cardBg} ${cardShadow} p-2 sm:p-6 border rounded-2xl animate-fade-in transition-colors duration-200`}>
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
              {/* Método de pago fijo: Stripe */}
              <div className="mt-4 flex items-center gap-2">
                <span className="block text-sm font-semibold text-yellow-700 dark:text-yellow-300">Método de pago:</span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-100 dark:bg-zinc-800 text-blue-700 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-700">💳 Stripe</span>
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
      {/* Pago con Stripe */}
      {showStripePayment && (
        <StripePayment 
          amount={total}
          originalAmount={subtotal}
          discountAmount={discountValue}
          items={cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            description: item.category || undefined
          }))}
          onClose={() => {
            setShowStripePayment(false);
            console.log('🔄 Cerrando modal de pago, refrescando productos...');
            fetchProducts();
          }}
          onSuccess={handleStripePaymentSuccess}
          selectedClient={selectedClient}
        />
      )}
      {/* Ticket visual mejorado */}
      {ticket && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center print:bg-transparent print:relative print:inset-0 transition-colors ${getThemeClass({dark: 'bg-black/50', light: 'bg-black/50'})}`}>
          <div className={`ticket-print-area rounded-2xl shadow-2xl max-w-sm w-full mx-4 relative print:shadow-none print:bg-white print:text-black transition-colors ${getThemeClass({
            dark: 'bg-zinc-900 text-white',
            light: 'bg-white text-gray-900'
          })}`}>
            <button 
              className={`absolute top-4 right-4 text-2xl font-bold z-10 print:hidden transition-colors ${getThemeClass({
                dark: 'text-gray-400 hover:text-white',
                light: 'text-gray-600 hover:text-gray-900'
              })}`}
              onClick={() => {
                setTicket(null);
                // No limpiar carrito aquí, ya se limpia automáticamente después del pago
              }}
            >
              ×
            </button>
            
            {/* Ticket profesional */}
            <div className="p-8">
              {/* Header del negocio */}
              <div className="text-center mb-6">
                <h2 className={`text-2xl font-bold mb-1 ${getThemeClass({dark: 'text-white', light: 'text-gray-800'})}`}>
                  {businessName}
                </h2>
                <div className={`text-sm ${getThemeClass({dark: 'text-gray-400', light: 'text-gray-500'})}`}>
                  Sistema de Gestión de Ventas
                </div>
                <div className={`text-xs ${getThemeClass({dark: 'text-gray-500', light: 'text-gray-400'})}`}>
                  Av. Principal 123, Ciudad
                </div>
                <div className={`text-xs ${getThemeClass({dark: 'text-gray-500', light: 'text-gray-400'})}`}>
                  Tel. (555) 123-4567
                </div>
              </div>
              
              {/* Línea separadora */}
              <div className={`border-t-2 border-dashed my-4 ${getThemeClass({dark: 'border-gray-600', light: 'border-gray-300'})}`}></div>
              
              {/* Info del ticket */}
              <div className="text-center mb-6">
                <h3 className={`text-xl font-bold mb-2 ${getThemeClass({dark: 'text-white', light: 'text-gray-800'})}`}>
                  TICKET DE VENTA
                </h3>
                <div className={`text-lg font-mono ${getThemeClass({dark: 'text-gray-300', light: 'text-gray-700'})}`}>
                  #{ticket.ticket_id || ticket.id}
                </div>
                <div className={`text-sm mt-1 ${getThemeClass({dark: 'text-gray-400', light: 'text-gray-500'})}`}>
                  {new Date(ticket.date).toLocaleString()}
                </div>
                <div className={`text-xs mt-1 ${getThemeClass({dark: 'text-gray-500', light: 'text-gray-400'})}`}>
                  Cajero: {user?.email || 'Sistema'}
                </div>
              </div>
              
              {/* Productos */}
              <div className="mb-6">
                <h4 className={`font-bold mb-3 pb-1 border-b ${getThemeClass({
                  dark: 'text-white border-gray-600',
                  light: 'text-gray-800 border-gray-200'
                })}`}>
                  PRODUCTOS
                </h4>
                <div className="space-y-2">
                  {(ticket.items || ticket.products).map((item: any, index: number) => {
                    const itemTotal = item.price * item.quantity;
                    const hasDiscount = item.original_price && item.original_price > item.price;
                    const originalTotal = (item.original_price || item.price) * item.quantity;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className={`font-medium ${getThemeClass({dark: 'text-white', light: 'text-gray-800'})}`}>
                              {item.name || 'Producto'}
                            </div>
                            <div className={`text-xs ${getThemeClass({dark: 'text-gray-400', light: 'text-gray-500'})}`}>
                              {hasDiscount ? (
                                <>
                                  <span className="line-through mr-2">
                                    ${item.original_price?.toFixed(2)} x {item.quantity}
                                  </span>
                                  <span className="text-green-500 font-medium">
                                    ${item.price.toFixed(2)} x {item.quantity}
                                  </span>
                                </>
                              ) : (
                                `$${item.price.toFixed(2)} x ${item.quantity}`
                              )}
                            </div>
                            {hasDiscount && (
                              <div className="text-xs text-green-500 font-medium">
                                ¡DESCUENTO APLICADO! Ahorro: ${(originalTotal - itemTotal).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className={`font-bold ml-4 ${getThemeClass({dark: 'text-white', light: 'text-gray-800'})}`}>
                            ${itemTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Línea separadora */}
              <div className={`border-t-2 border-dashed my-4 ${getThemeClass({dark: 'border-gray-600', light: 'border-gray-300'})}`}></div>
              
              {/* Cálculos del total */}
              <div className="mb-6">
                {(() => {
                  const items = ticket.items || ticket.products;
                  const subtotal = items.reduce((sum: number, item: any) => {
                    const originalPrice = item.original_price || item.price;
                    return sum + (originalPrice * item.quantity);
                  }, 0);
                  const totalDescuento = subtotal - ticket.total;
                  const hasGlobalDiscount = totalDescuento > 0.01; // Tolerancia por redondeo

                  return (
                    <div className="space-y-2">
                      {hasGlobalDiscount && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className={getThemeClass({dark: 'text-gray-300', light: 'text-gray-600'})}>Subtotal:</span>
                            <span className={getThemeClass({dark: 'text-white', light: 'text-gray-800'})}>
                              ${subtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Descuento aplicado:</span>
                            <span>-${totalDescuento.toFixed(2)}</span>
                          </div>
                          <div className={`border-t pt-2 ${getThemeClass({dark: 'border-gray-600', light: 'border-gray-300'})}`}>
                            <div className="flex justify-between items-center text-2xl font-bold">
                              <span className={getThemeClass({dark: 'text-white', light: 'text-gray-800'})}>
                                TOTAL A PAGAR:
                              </span>
                              <span className="text-green-600">${ticket.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {!hasGlobalDiscount && (
                        <div className="flex justify-between items-center text-2xl font-bold">
                          <span className={getThemeClass({dark: 'text-white', light: 'text-gray-800'})}>
                            TOTAL A PAGAR:
                          </span>
                          <span className="text-green-600">${ticket.total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Footer */}
              <div className={`text-center text-xs space-y-1 ${getThemeClass({dark: 'text-gray-500', light: 'text-gray-400'})}`}>
                <div>¡Gracias por su compra!</div>
                <div>Conserve este ticket como comprobante</div>
                <div className={`mt-3 pt-2 border-t ${getThemeClass({dark: 'border-gray-600', light: 'border-gray-200'})}`}>
                  Powered by {businessName} - POS v1.0
                </div>
              </div>
            </div>
            
            {/* Botón imprimir */}
            <div className="px-8 pb-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors print:hidden"
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

      {/* Notificaciones de pagos */}
      <PaymentNotifications />
    </main>
  </>);
}

// Export por defecto
export default HomeComponent;

// Export named también para compatibilidad
export { HomeComponent };


