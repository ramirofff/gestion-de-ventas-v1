"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../types/product';


interface ProductsContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  fetchProducts: () => Promise<void>;
  loading: boolean;
  error: string | null;
  retryFetchProducts: () => void;
}
const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: fetch con timeout para evitar quedadas indefinidas
  const fetchWithTimeout = async (ms: number) => {
    let timeoutId: NodeJS.Timeout | undefined = undefined;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout cargando productos después de ${ms}ms`)), ms);
      });
      await Promise.race([fetchProducts(), timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  };

  const fetchProducts = async () => {
    console.log('🔄 ProductsProvider: Iniciando carga de productos... (loading:', loading, ')');
    setLoading(true);
    setError(null);
    try {
      // Test de conexión primero
      const { data: testConnection } = await supabase
        .from('products')
        .select('count')
        .limit(1);
      console.log('🔗 Test de conexión a Supabase:', testConnection ? 'OK' : 'FAIL');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('❌ Error cargando productos:', error);
        setProducts([]);
        setError(error.message || 'Error cargando productos');
      } else {
        console.log('✅ Productos cargados exitosamente:', data?.length || 0);
        setProducts(data || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('❌ Error inesperado cargando productos:', err);
      setProducts([]);
      setError(err?.message || 'Error inesperado cargando productos');
    } finally {
      setLoading(false);
    }
  };

  // Retry mechanism for UI
  const retryFetchProducts = () => {
    setError(null);
    setLoading(true);
    // Usar timeout corto en reintento para no quedar colgado
    fetchWithTimeout(10000).catch((e) => {
      console.warn('Reintento con timeout falló:', e);
      setLoading(false);
    });
  };

  useEffect(() => {
    // Carga inicial con timeout
    console.log('🚀 ProductsProvider: Iniciando carga inicial de productos...');
    const loadWithTimeout = async () => {
      let timeoutId: NodeJS.Timeout | undefined = undefined;
      try {
        console.log('⏱️ Iniciando carga con timeout de 15 segundos...');
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout cargando productos después de 15 segundos')), 15000);
        });
        await Promise.race([fetchProducts(), timeoutPromise]);
        console.log('✅ Carga de productos completada exitosamente');
      } catch (err: any) {
        console.error('❌ Error con timeout cargando productos:', err);
        setLoading(false);
        setProducts([]);
        setError(err?.message || 'Error cargando productos (timeout)');
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    };
    loadWithTimeout();

    // Escuchar auth para recargar tras login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user ? 'with user' : 'no user');
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Usuario conectado, recargando productos...');
        await fetchWithTimeout(10000);
      }
    });

    // Reintentos al volver a estar visible o reconectar red
    const handleVisibility = () => {
      if (!document.hidden) {
        console.log('👁️ Pestaña visible: refrescando productos');
        fetchWithTimeout(8000).catch(() => {});
      }
    };
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada: refrescando productos');
      fetchWithTimeout(8000).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Watchdog: si loading persiste > 12s, forzar un reintento con timeout
  useEffect(() => {
    if (!loading) return;
    const watchdog = setTimeout(() => {
      if (loading) {
        console.warn('⏱️ Watchdog: loading prolongado, forzando reintento...');
        retryFetchProducts();
      }
    }, 12000);
    return () => clearTimeout(watchdog);
  }, [loading]);

  return (
    <ProductsContext.Provider value={{ products, setProducts, loading, fetchProducts, error, retryFetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export const useProductsContext = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProductsContext must be used within a ProductsProvider');
  }
  return context;
}
