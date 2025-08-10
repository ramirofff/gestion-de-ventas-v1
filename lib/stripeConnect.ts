// lib/stripeConnect.ts - Gestión de Stripe Connect
import Stripe from 'stripe';
import { supabaseAdmin } from './supabaseClient';

// Tu cuenta master Stripe (LLC USA)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export interface ConnectedAccount {
  id: string;
  email: string;
  country: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export interface ClientAccountData {
  email: string;
  businessName: string;
  firstName: string;
  lastName: string;
  country: string;
  currency: string;
}

// 🏗️ CREAR SUBCUENTA PARA CLIENTE ARGENTINO
export async function createConnectedAccount(clientData: ClientAccountData): Promise<ConnectedAccount> {
  try {
    console.log('🇦🇷 Creando subcuenta para cliente:', clientData.email);

    // IMPORTANTE: Argentina no soporta card_payments directamente
    // Estrategia: Crear cuenta "virtual" solo para tracking de comisiones
    // Los pagos se procesarán en tu cuenta principal de USA y se harán transfers
    
    if (clientData.country === 'AR') {
      console.log('🚨 NOTA: Argentina no soporta procesamiento directo de pagos');
      console.log('💡 Se creará una cuenta virtual para tracking de comisiones');
      
      // Para Argentina, crear una entrada en la base de datos sin cuenta real de Stripe
      // Los pagos se procesarán en la cuenta principal y se calcularan comisiones
      return {
        id: `ar_virtual_${Date.now()}`, // ID virtual para Argentina
        email: clientData.email,
        country: clientData.country,
        details_submitted: true, // Marcar como completado
        charges_enabled: false, // Argentina no puede procesar pagos directamente
        payouts_enabled: true, // Puede recibir transfers
      };
    }

    // Para otros países que sí soportan Stripe Connect
    const account = await stripe.accounts.create({
      type: 'express',
      country: clientData.country,
      email: clientData.email,
      business_type: 'individual',
      individual: {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
      },
      business_profile: {
        name: clientData.businessName,
        product_description: 'Venta de productos y servicios digitales',
        url: 'https://tu-cliente.com',
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
            delay_days: 2,
          },
        },
      },
    });

    console.log('✅ Subcuenta real creada:', account.id);

    return {
      id: account.id,
      email: account.email || clientData.email,
      country: account.country || clientData.country,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };

  } catch (error) {
    console.error('❌ Error creando subcuenta:', error);
    throw new Error(`Error al crear cuenta conectada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔗 CREAR LINK DE ONBOARDING
export async function createOnboardingLink(accountId: string): Promise<string> {
  try {
    // Si es una cuenta virtual de Argentina, no necesita onboarding
    if (accountId.startsWith('ar_virtual_')) {
      console.log('🇦🇷 Cuenta virtual de Argentina - no requiere onboarding');
      return '#onboarding-complete'; // Retornar un link dummy
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/onboarding/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/onboarding/complete`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('❌ Error creando link de onboarding:', error);
    throw error;
  }
}

// 💳 CREAR PAGO CON COMISIÓN
export async function createPaymentWithCommission({
  connectedAccountId,
  amount,
  commissionRate = 0.05, // 5% por defecto
  currency = 'usd',
  productName = 'Producto',
  customerEmail,
  isQRPayment = false, // Nuevo parámetro
  cartData = [], // Agregar datos del carrito
  userId, // Agregar userId para metadatos
}: {
  connectedAccountId: string;
  amount: number;
  commissionRate?: number;
  currency?: string;
  productName?: string;
  customerEmail?: string;
  isQRPayment?: boolean;
  cartData?: any[]; // Agregar tipo para datos del carrito
  userId?: string; // Agregar tipo para userId
}) {
  try {
    const commissionAmount = Math.round(amount * commissionRate);
    const netAmount = amount - commissionAmount;

    console.log('💰 Creando pago con comisión:');
    console.log(`- Total: $${amount} ${currency.toUpperCase()}`);
    console.log(`- Comisión: $${commissionAmount} ${currency.toUpperCase()}`);
    console.log(`- Cliente recibe: $${netAmount} ${currency.toUpperCase()}`);
    console.log(`- Tipo: ${isQRPayment ? 'QR Payment' : 'Direct Link'}`);

    // Determinar URLs según el tipo de pago
    const successUrl = isQRPayment 
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment/thank-you?session_id={CHECKOUT_SESSION_ID}`;
    
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment/cancel`;
    // Para cuentas virtuales de Argentina, procesar el pago sin transfer automático
    if (connectedAccountId.startsWith('ar_virtual_')) {
      console.log('🇦🇷 Procesando pago para cuenta virtual Argentina');
      
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency,
            product_data: { 
              name: productName,
              description: `Cliente Argentina - Transfer manual requerido`
            },
            unit_amount: amount * 100, // Stripe usa centavos
          },
          quantity: 1,
        }],
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          connected_account: connectedAccountId,
          commission_rate: commissionRate.toString(),
          cart_data: JSON.stringify(cartData), // Agregar datos del carrito
          user_id: userId || '', // Agregar userId a metadatos con fallback
        },
      });

      return session;
    }

    // Para cuentas reales de Stripe Connect (países soportados)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: { 
            name: productName,
            description: `Procesado por plataforma - Comisión: ${(commissionRate * 100).toFixed(1)}%`
          },
          unit_amount: amount * 100, // Stripe usa centavos
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: commissionAmount * 100, // Tu comisión en centavos
        transfer_data: {
          destination: connectedAccountId, // Subcuenta del cliente
        },
      },
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        connected_account: connectedAccountId,
        commission_rate: commissionRate.toString(),
        cart_data: JSON.stringify(cartData), // Agregar datos del carrito
        user_id: userId || '', // Agregar userId a metadatos con fallback
      },
    });

    return session;
  } catch (error) {
    console.error('❌ Error creando pago con comisión:', error);
    throw error;
  }
}

// 📊 OBTENER INFO DE SUBCUENTA
export async function getAccountInfo(accountId: string): Promise<ConnectedAccount> {
  try {
    // Si es una cuenta virtual de Argentina, devolver datos simulados
    if (accountId.startsWith('ar_virtual_')) {
      return {
        id: accountId,
        email: 'Cliente Argentina',
        country: 'AR',
        details_submitted: true,
        charges_enabled: false, // Argentina no puede procesar pagos directamente
        payouts_enabled: true,  // Puede recibir transfers manuales
      };
    }

    // Para cuentas reales de Stripe
    const account = await stripe.accounts.retrieve(accountId);
    
    return {
      id: account.id,
      email: account.email || 'Sin email',
      country: account.country || 'Sin país',
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };
  } catch (error) {
    console.error('❌ Error obteniendo info de cuenta:', error);
    throw error;
  }
}

// 💸 OBTENER HISTORIAL DE TRANSFERENCIAS
export async function getTransferHistory(accountId: string, limit = 10) {
  try {
    const transfers = await stripe.transfers.list({
      destination: accountId,
      limit: limit,
    });

    return transfers.data.map(transfer => ({
      id: transfer.id,
      amount: transfer.amount / 100, // Convertir de centavos
      currency: transfer.currency,
      created: new Date(transfer.created * 1000),
      status: 'completed', // Los transfers siempre están completados cuando aparecen aquí
    }));
  } catch (error) {
    console.error('❌ Error obteniendo transferencias:', error);
    throw error;
  }
}

// 💾 GUARDAR CLIENTE EN BASE DE DATOS
export async function saveClientAccount(clientData: {
  userId: string;
  stripeAccountId: string;
  email: string;
  businessName: string;
  country: string;
  commissionRate: number;
}) {
  try {
    console.log('💾 Guardando cuenta en Supabase:', {
      userId: clientData.userId,
      stripeAccountId: clientData.stripeAccountId,
      email: clientData.email,
      businessName: clientData.businessName,
      country: clientData.country
    });

    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .insert([{
        user_id: clientData.userId,
        stripe_account_id: clientData.stripeAccountId,
        email: clientData.email,
        business_name: clientData.businessName,
        country: clientData.country,
        commission_rate: clientData.commissionRate,
        status: clientData.country === 'AR' ? 'active' : 'pending', // Argentina activa automáticamente
        details_submitted: clientData.country === 'AR', // Argentina no requiere onboarding
        charges_enabled: clientData.country !== 'AR', // Solo países con Stripe real
        payouts_enabled: true,
        onboarding_completed: clientData.country === 'AR',
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error('❌ Error detallado de Supabase:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    console.log('✅ Cuenta guardada exitosamente en Supabase');
    return data;
  } catch (error) {
    console.error('❌ Error guardando cliente:', error);
    throw error;
  }
}

export { stripe };
