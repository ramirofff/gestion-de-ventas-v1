import { supabase } from './supabaseClient';

export interface ClientAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  email: string;
  business_name: string;
  country: string;
  platform_fee_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ClientAccountManager {
  // Crear/registrar nuevo cliente
  static async createClient(data: {
    user_id: string;
    stripe_account_id: string;
    email: string;
    business_name: string;
    country?: string;
    platform_fee_percent?: number;
  }): Promise<{ success: boolean; client?: ClientAccount; error?: string }> {
    try {
      const clientData = {
        ...data,
        country: data.country || 'AR',
        platform_fee_percent: data.platform_fee_percent || 3,
        is_active: true
      };

      const { data: client, error } = await supabase
        .from('client_accounts')
        .insert([clientData])
        .select()
        .single();

      if (error) {
        console.error('Error creating client:', error);
        return { success: false, error: error.message };
      }

      return { success: true, client };
    } catch (error: any) {
      console.error('Error in createClient:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener cliente por user_id
  static async getClientByUserId(user_id: string): Promise<ClientAccount | null> {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching client by user_id:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getClientByUserId:', error);
      return null;
    }
  }

  // Obtener cliente por stripe_account_id
  static async getClientByStripeId(stripe_account_id: string): Promise<ClientAccount | null> {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('stripe_account_id', stripe_account_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching client by stripe_id:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getClientByStripeId:', error);
      return null;
    }
  }

  // Obtener todos los clientes activos
  static async getAllActiveClients(): Promise<ClientAccount[]> {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active clients:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllActiveClients:', error);
      return [];
    }
  }
}
