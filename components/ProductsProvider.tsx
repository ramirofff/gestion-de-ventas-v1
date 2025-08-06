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
  const [user, setUser] = useState<any>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    // Verificar usuario autenticado antes de cargar productos
    const initializeProducts = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      setUser(user);
      
      if (user && !error) {
        // Usuario autenticado, cargar productos
        await fetchProducts();
      } else {
        // No hay usuario, detener loading pero no cargar productos
        setLoading(false);
      }
    };

    initializeProducts();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProducts(); // Recargar productos cuando se hace login
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProducts([]); // Limpiar productos cuando se hace logout
        setLoading(false);
      }
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
