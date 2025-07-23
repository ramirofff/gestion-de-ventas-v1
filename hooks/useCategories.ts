"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Category } from '../types/category';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select();
    if (!error && data) setCategories((prev) => [data[0], ...prev]);
    return { data, error };
  };

  return { categories, loading, error, addCategory, fetchCategories };
}
