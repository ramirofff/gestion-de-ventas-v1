
import { supabase } from './supabaseClient';
import { CartItem } from '../hooks/useCart';

export async function createSale(cart: CartItem[], total: number, userId?: string) {
  const { data, error } = await supabase.from('sales').insert([
    {
      user_id: userId || null,
      products: cart.map(({ quantity, ...item }) => ({ ...item, quantity })),
      total,
      created_at: new Date().toISOString(),
    },
  ]).select();
  return { data, error };
}
