"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Category } from '../types/category';
import { getCategoriesForUser, createCategory, initializeDatabase } from '../lib/database';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('Obteniendo categorías actualizadas...');
      
      // Intentar inicializar la base de datos primero
      await initializeDatabase();
      
      // Obtener categorías
      const data = await getCategoriesForUser();
      console.log('Categorías obtenidas:', data);
      setCategories(data);
      setError(null);
      return data;
    } catch (err) {
      console.error('Error al obtener categorías:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      
      // Si el error es de autenticación, no lo mostramos como error crítico
      if (errorMessage.includes('Usuario no autenticado') || errorMessage.includes('sesión') || errorMessage.includes('Auth session missing')) {
        console.warn('Sin sesión activa, categorías no disponibles');
        setError(null); // No mostrar error de auth como error crítico
        setCategories([]);
        return [];
      }
      
      setError(errorMessage);
      setCategories([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (name: string, userId: string) => {
    try {
      const data = await createCategory(name);
      
      if (data && data[0]) {
        setCategories((prev) => [data[0], ...prev]);
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Error al agregar categoría:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      return { data: null, error: { message: errorMessage } };
    }
  };

  return { categories, loading, error, addCategory, fetchCategories };
}
