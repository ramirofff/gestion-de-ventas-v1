import { Product } from './product';

export interface SaleProduct extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  user_id: string;
  products: SaleProduct[];
  total: number;
  date: string; // ISO string
  ticket_id?: string;
  created_at?: string;
}
