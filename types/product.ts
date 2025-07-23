export interface Product {
  id: string;
  user_id: string;
  name: string;
  price: number;
  original_price: number;
  category: string;
  image_url: string;
  created_at: string; // ISO timestamp
  inactive?: boolean;
}
