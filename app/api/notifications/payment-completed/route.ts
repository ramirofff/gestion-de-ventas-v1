// app/api/notifications/payment-completed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { session_id, ticket_data, notification_type } = await request.json();
    
    console.log('📢 Notificación de pago completado:', {
      session_id,
      type: notification_type,
      total: ticket_data?.total
    });

    // Buscar en commission_sales para encontrar qué vendedor debe ser notificado
    const { data: saleData, error: saleError } = await supabaseAdmin
      .from('commission_sales')
      .select(`
        *,
        connected_accounts!inner(user_id, business_name)
      `)
      .eq('stripe_session_id', session_id)
      .single();

    if (saleError || !saleData) {
      console.warn('⚠️ No se encontró información de venta para notificar:', saleError);
      return NextResponse.json({
        success: false,
        message: 'Venta no encontrada para notificar'
      });
    }

    // Crear notificación en la base de datos (opcional)
    const notificationData = {
      user_id: saleData.connected_accounts.user_id,
      type: 'payment_completed',
      title: 'Nuevo Pago Recibido',
      message: `Se completó un pago por $${ticket_data.total} USD`,
      data: {
        session_id,
        business_name: saleData.connected_accounts.business_name,
        amount: ticket_data.total,
        customer_email: ticket_data.customer_email,
        items_count: ticket_data.items?.length || 0
      },
      read: false,
      created_at: new Date().toISOString()
    };

    console.log('✅ Pago completado notificado correctamente:', {
      vendor_id: saleData.connected_accounts.user_id,
      business: saleData.connected_accounts.business_name,
      amount: ticket_data.total
    });

    return NextResponse.json({
      success: true,
      message: 'Notificación enviada',
      vendor_notified: true
    });

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
