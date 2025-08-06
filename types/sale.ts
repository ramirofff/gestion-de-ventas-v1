import { Product } from './product';

export interface SaleProduct extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id?: string;
  products: SaleProduct[]; // Campo principal JSONB
  items: SaleProduct[];    // Campo adicional JSONB
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
}
