
import { supabase, supabaseAdmin } from './supabaseClient';
import { CartItem } from '../hooks/useCart';

export async function createSale(
  cart: CartItem[],
  total: number,
  userId?: string,
  clientId?: string,
  stripePaymentIntentId?: string | any,
  metadata?: any,
  useAdminClient = false
) {
  // LIMPIAR EL PAYMENT INTENT ID SI VIENE COMO OBJETO
  let cleanPaymentIntentId: string | undefined = undefined;
  if (stripePaymentIntentId) {
    if (typeof stripePaymentIntentId === 'string') {
      try {
        const parsed = JSON.parse(stripePaymentIntentId);
        cleanPaymentIntentId = parsed.id || stripePaymentIntentId;
      } catch {
        cleanPaymentIntentId = stripePaymentIntentId;
      }
    } else if (typeof stripePaymentIntentId === 'object' && stripePaymentIntentId.id) {
      cleanPaymentIntentId = stripePaymentIntentId.id;
    }
  }
  // Seleccionar el cliente de Supabase apropiado
  const client = useAdminClient ? supabaseAdmin : supabase;
  // VERIFICACIÓN ATÓMICA DE DUPLICADOS CON UPSERT
  if (cleanPaymentIntentId) {
    try {
      const { data: existingSale, error: checkError } = await client
        .from('sales')
        .select('id, stripe_payment_intent_id, ticket_id, created_at')
        .eq('stripe_payment_intent_id', cleanPaymentIntentId)
        .limit(1);
      if (!checkError && existingSale && existingSale.length > 0) {
        return {
          data: existingSale,
          error: null,
          message: 'Venta ya procesada anteriormente',
          isDuplicate: true
        };
      }
    } catch {
      // Si falla la verificación, continuar
    }
  }
  // Validar datos de entrada
  if (!cart || cart.length === 0) {
    throw new Error('El carrito está vacío');
  }
    
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }
  if (total <= 0) {
    throw new Error('El total debe ser mayor a 0');
  }


  // Preparar los productos en el formato que espera la base de datos
  const items = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    total: (item.price * item.quantity)
  }));
  // Calcular subtotal (sin descuento)
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // El total recibido ya es el monto final con descuento aplicado
  const discount_amount = subtotal - total;
  // Preparar el objeto de inserción según la estructura real de tu tabla
  const saleData = {
    user_id: userId,
    products: items,
    subtotal: subtotal,
    discount_amount: discount_amount > 0 ? discount_amount : 0,
    total: total,
    payment_method: cleanPaymentIntentId ? 'stripe' : 'cash',
    payment_status: 'completed',
    status: 'completed',
    stripe_payment_intent_id: cleanPaymentIntentId || null,
    metadata: metadata || null
  };
  // Inserción principal
  const { data, error } = await client.from('sales').insert([saleData]).select();
  if (error) {
    // Si es un error de duplicado, intentar recuperar la venta existente
    if (error.code === '23505' && cleanPaymentIntentId) {
      const { data: existingSale } = await client
        .from('sales')
        .select('*')
        .eq('stripe_payment_intent_id', cleanPaymentIntentId)
        .limit(1);
      if (existingSale && existingSale.length > 0) {
        return {
          data: existingSale,
          error: null,
          isDuplicate: true
        };
      }
    }
    throw new Error(`Error de base de datos: ${error.message || 'Error desconocido'} (Código: ${error.code || 'N/A'})`);
  }
  return { data, error: null };
}
