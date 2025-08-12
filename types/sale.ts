import { Product } from './product';

export interface SaleProduct extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id?: string;
  // ...existing code...
  products: SaleProduct[]; // Campo principal JSONB
  // ...existing code...
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  notes?: string;
  order_date?: string;
  created_at?: string;
  updated_at?: string;
  ticket_id?: string;
  stripe_payment_intent_id?: string; // ID del payment intent de Stripe
  metadata?: any; // Metadata adicional del pago
}
