import { supabase } from './supabaseClient';

export interface StripeConfig {
  id: string;
  account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_type?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export class StripeConfigManager {
  private static readonly CONFIG_ID = 'main-stripe-config';

  // Obtener configuración desde Supabase
  static async getConfig(): Promise<StripeConfig | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_configs')
        .select('*')
        .eq('id', this.CONFIG_ID)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching Stripe config:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getConfig:', error);
      return null;
    }
  }

  // Guardar configuración en Supabase
  static async saveConfig(accountData: {
    account_id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    business_type?: string;
    country?: string;
  }): Promise<boolean> {
    try {
      const configData: Omit<StripeConfig, 'created_at' | 'updated_at'> = {
        id: this.CONFIG_ID,
        ...accountData
      };

      const { error } = await supabase
        .from('stripe_configs')
        .upsert(configData, { 
          onConflict: 'id' 
        });

      if (error) {
        console.error('Error saving Stripe config:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveConfig:', error);
      return false;
    }
  }

  // Migrar desde localStorage si existe
  static async migrateFromLocalStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    const localData = localStorage.getItem('stripe_account');
    if (!localData) return;

    try {
      const accountData = JSON.parse(localData);
      const saved = await this.saveConfig(accountData);
      
      if (saved) {
        // Limpiar localStorage después de migrar
        localStorage.removeItem('stripe_account');
        console.log('Migrated Stripe config from localStorage to Supabase');
      }
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
    }
  }

  // Verificar si la cuenta está completamente configurada
  static isAccountReady(config: StripeConfig | null): boolean {
    if (!config) return false;
    return config.charges_enabled && config.payouts_enabled && config.details_submitted;
  }
}
