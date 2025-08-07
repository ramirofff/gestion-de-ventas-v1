import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../../lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      amount, 
      currency = 'usd', 
      description, 
      items = [],
      customer_email,
      user_id, // ID del usuario autenticado
      success_url,
      cancel_url 
    } = body;

    // Validaciones
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    console.log('💳 Creando sesión de pago para usuario:', customer_email, '(ID:', user_id, ')');

    // Configurar URLs de retorno
    const defaultSuccessUrl = `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${request.nextUrl.origin}/payment/cancel`;

    // Crear líneas de productos para Stripe
    const lineItems = items.map((item: {
      name: string;
      price: number;
      quantity: number;
      description?: string;
    }) => {
      const productData: any = {
        name: item.name || 'Producto',
      };
      
      // Solo agregar descripción si no está vacía
      if (item.description && item.description.trim() !== '') {
        productData.description = item.description;
      }
      
      return {
        price_data: {
          currency: currency,
          product_data: productData,
          unit_amount: Math.round(item.price * 100), // Stripe usa centavos
        },
        quantity: item.quantity || 1,
      };
    });

    // Si no hay items específicos, crear uno genérico
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: currency,
          product_data: {
            name: description || 'Venta',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      });
    }

    // Buscar o crear customer en Stripe con el email del usuario autenticado
    let customerId = null;
    if (customer_email) {
      // Buscar customer existente por email
      const existingCustomers = await stripe.customers.list({
        email: customer_email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        console.log('✅ Customer existente encontrado:', customerId);
      } else {
        // Crear nuevo customer
        const newCustomer = await stripe.customers.create({
          email: customer_email,
          metadata: {
            user_id: user_id || 'unknown',
            created_from: 'saas_app',
            country: 'AR', // Cliente argentino usando la plataforma
          },
        });
        customerId = newCustomer.id;
        console.log('🆕 Nuevo customer creado:', customerId);
      }
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Tarjetas internacionales
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || defaultSuccessUrl,
      cancel_url: cancel_url || defaultCancelUrl,
      
      // 🔒 CONFIGURACIÓN PARA OCULTAR EMAIL COMPLETAMENTE
      customer: customerId || undefined, // Usar customer existente
      customer_email: !customerId && customer_email ? customer_email : undefined,
      customer_creation: customerId ? undefined : 'if_required', // Solo crear si es necesario
      
      // 🎯 CONFIGURACIÓN PARA OCULTAR CAMPOS
      billing_address_collection: 'required', // Solo pedir dirección
      phone_number_collection: { enabled: false }, // No pedir teléfono
      
      metadata: {
        description: description || '',
        created_at: new Date().toISOString(),
        merchant_country: 'AR',
        user_id: user_id || 'unknown',
        customer_email: customer_email || 'no-email',
        merchant_email: customer_email || 'no-email', // Tu email como merchant
      },
      
      payment_intent_data: {
        receipt_email: customer_email || undefined, // Receipt a tu email
        metadata: {
          user_id: user_id || 'unknown',
          customer_email: customer_email || 'no-email',
          merchant_email: customer_email || 'no-email',
        },
      },
      
      // Configuración UX optimizada
      locale: 'es', // Formulario en español
      submit_type: 'pay', // Botón "Pagar"
    });

    return NextResponse.json({
      payment_url: session.url,
      session_id: session.id,
      amount: amount,
      currency: currency.toUpperCase(),
    });

  } catch (error: unknown) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
