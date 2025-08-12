import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Configuración para Stripe Express
export const STRIPE_EXPRESS_CONFIG = {
  client_id: process.env.STRIPE_EXPRESS_CLIENT_ID,
  redirect_uri: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api/stripe/express/callback'
  : 'https://gestion-de-ventas-v1.vercel.app/api/stripe/express/callback',
};

// Tipos para Stripe Express
export interface StripeExpressAccount {
  id: string;
  object: string;
  business_profile?: {
    name?: string;
    url?: string;
  };
  capabilities?: {
    card_payments?: string;
    transfers?: string;
  };
  charges_enabled: boolean;
  country: string;
  default_currency: string;
  details_submitted: boolean;
  email?: string;
  payouts_enabled: boolean;
  type: string;
}
