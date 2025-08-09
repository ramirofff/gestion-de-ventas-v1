"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../types/product';


interface ProductsContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  fetchProducts: () => Promise<void>;
  loading: boolean;
}
const ProductsContext = createContext<ProductsContextType | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    console.log('🔄 ProductsProvider: Iniciando carga de productos... (loading:', loading, ')');
    setLoading(true);
    
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
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setProducts([]);
      } else {
        console.log('✅ Productos cargados exitosamente:', data?.length || 0);
        console.log('🔄 Actualizando estado: setProducts y setLoading(false)...');
        setProducts(data || []);
      }
    } catch (err) {
      console.error('❌ Error inesperado cargando productos:', err);
      setProducts([]);
    } finally {
      console.log('🔄 Finalizando carga: setLoading(false)');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar productos inmediatamente sin verificar usuario
    console.log('🚀 ProductsProvider: Iniciando carga inicial de productos...');
    
    // Agregar timeout para evitar que se quede cargando indefinidamente
    const loadWithTimeout = async () => {
      try {
        console.log('⏱️ Iniciando carga con timeout de 15 segundos...');
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout cargando productos después de 15 segundos')), 15000)
        );
        
        await Promise.race([fetchProducts(), timeoutPromise]);
        console.log('✅ Carga de productos completada exitosamente');
      } catch (err) {
        console.error('❌ Error con timeout cargando productos:', err);
        console.error('❌ Esto podría indicar un problema de RLS o conectividad');
        setLoading(false);
        setProducts([]);
      }
    };

    loadWithTimeout();

    // Escuchar cambios de autenticación para recargar si es necesario
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user ? 'with user' : 'no user');
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ Usuario conectado, recargando productos...');
        await fetchProducts(); 
      }
      // No limpiar productos al hacer logout, mantenerlos disponibles
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ProductsContext.Provider value={{ products, setProducts, loading, fetchProducts }}>
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
