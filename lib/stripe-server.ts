import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Log de modo (no imprime la key completa)
(() => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  console.log('[Stripe] Key mode:', key.startsWith('sk_live_') ? 'LIVE' : 'TEST');
})();

// Configuración opcional para Stripe Express (solo si usas OAuth)
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app';
export const STRIPE_EXPRESS_CONFIG = {
  client_id: process.env.STRIPE_EXPRESS_CLIENT_ID || undefined, // opcional
  redirect_uri: `${appUrl}/api/stripe/express/callback`,
};

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
