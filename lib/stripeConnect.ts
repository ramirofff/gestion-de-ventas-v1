// Obtener commission_rate de connected_accounts por id (connected_account_id)
export async function getCommissionRateByAccountId(accountId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('commission_rate')
    .eq('id', accountId)
    .single();
  if (error || !data) {
    return 0.05;
  }
  return typeof data.commission_rate === 'number' ? data.commission_rate : parseFloat(data.commission_rate) || 0.05;
}
// Obtener commission_rate de connected_accounts por user_id
export async function getCommissionRateByUserId(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('connected_accounts')
    .select('commission_rate')
    .eq('user_id', userId)
    .single();
  if (error || !data) {
    return 0.05;
  }
  return typeof data.commission_rate === 'number' ? data.commission_rate : parseFloat(data.commission_rate) || 0.05;
}
// lib/stripeConnect.ts - Gestión de Stripe Connect
import Stripe from 'stripe';
import { supabaseAdmin } from './supabaseClient';

// Tu cuenta master Stripe (LLC USA)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Log de modo (no imprime la key)
(() => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  console.log('[StripeConnect] Key mode:', key.startsWith('sk_live_') ? 'LIVE' : 'TEST');
})();

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

    // IMPORTANTE: Argentina no soporta card_payments directamente
    // Estrategia: Crear cuenta "virtual" solo para tracking de comisiones
    // Los pagos se procesarán en tu cuenta principal de USA y se harán transfers
    
    if (clientData.country === 'AR') {
      
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


    return {
      id: account.id,
      email: account.email || clientData.email,
      country: account.country || clientData.country,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    };

  } catch (error) {
    throw new Error(`Error al crear cuenta conectada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// 🔗 CREAR LINK DE ONBOARDING
export async function createOnboardingLink(accountId: string): Promise<string> {
  try {
    // Si es una cuenta virtual de Argentina, no necesita onboarding
    if (accountId.startsWith('ar_virtual_')) {
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
    const commissionAmount = Math.round(amount * commissionRate * 100) / 100;
    const netAmount = Math.round((amount - commissionAmount) * 100) / 100;

    // Diagnóstico: si no es cuenta virtual, loguear livemode de la subcuenta
    if (!connectedAccountId.startsWith('ar_virtual_')) {
      try {
        const acct = await stripe.accounts.retrieve(connectedAccountId);
        console.log('[StripeConnect] Connected account', acct.id, 'livemode:', acct.livemode);
      } catch (e) {
        console.warn('[StripeConnect] No se pudo obtener la cuenta conectada', connectedAccountId, e);
      }
    }

    // Determinar URLs según el tipo de pago
    const successUrl = isQRPayment 
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment/thank-you?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gestion-de-ventas-v1.vercel.app'}/payment/cancel`;

    if (connectedAccountId.startsWith('ar_virtual_')) {
      // Intentar primero con Apple Pay/Google Pay, si falla usar solo card y link
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card', 'link', 'apple_pay', 'google_pay'],
          payment_method_options: {
            link: {
              persistent_token: undefined, // Stripe maneja automáticamente las tarjetas guardadas
            },
            apple_pay: {
              // Habilitar Apple Pay explícitamente
            },
            google_pay: {
              // Habilitar Google Pay explícitamente
            },
          },
        line_items: [{
          price_data: {
            currency: currency,
            product_data: { 
              name: productName,
              description: `Cliente Argentina - Transfer manual requerido`
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        }],
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: 'es',
        allow_promotion_codes: false,
        metadata: {
          connected_account: connectedAccountId,
          commission_rate: commissionRate.toString(),
          cart_data: JSON.stringify(cartData),
          user_id: userId || '',
        },
      });
      } catch (err: any) {
        // Si Apple Pay/Google Pay no están disponibles, usar solo card y link
        if (err?.code === 'parameter_invalid_empty' || err?.message?.includes('payment_method_types') || err?.message?.includes('apple_pay') || err?.message?.includes('google_pay')) {
          console.warn('[StripeConnect] Apple Pay/Google Pay no disponibles, usando solo card y link');
          session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card', 'link'],
            payment_method_options: {
              link: {
                persistent_token: undefined,
              },
            },
            line_items: [{
              price_data: {
                currency: currency,
                product_data: { 
                  name: productName,
                  description: `Cliente Argentina - Transfer manual requerido`
                },
                unit_amount: amount * 100,
              },
              quantity: 1,
            }],
            customer_email: customerEmail,
            success_url: successUrl,
            cancel_url: cancelUrl,
            locale: 'es',
            allow_promotion_codes: false,
            metadata: {
              connected_account: connectedAccountId,
              commission_rate: commissionRate.toString(),
              cart_data: JSON.stringify(cartData),
              user_id: userId || '',
            },
          });
        } else {
          throw err;
        }
      }
      console.log('[StripeConnect] Checkout session livemode:', (session as any).livemode, 'id:', session.id);
      return session;
    }

    // Para cuentas reales de Stripe Connect (países soportados)
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'link', 'apple_pay', 'google_pay'],
      payment_method_options: {
        link: {
          persistent_token: undefined, // Stripe maneja automáticamente las tarjetas guardadas
        },
        apple_pay: {
          // Habilitar Apple Pay explícitamente
        },
        google_pay: {
          // Habilitar Google Pay explícitamente
        },
      },
      line_items: [{
        price_data: {
          currency: currency,
          product_data: { 
            name: productName,
            description: `Procesado por plataforma - Comisión: ${(commissionRate * 100).toFixed(1)}%`
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: commissionAmount * 100,
        transfer_data: {
          destination: connectedAccountId,
        },
      },
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'es',
      allow_promotion_codes: false,
      metadata: {
        connected_account: connectedAccountId,
        commission_rate: commissionRate.toString(),
        cart_data: JSON.stringify(cartData),
        user_id: userId || '',
      },
    });
    } catch (err: any) {
      // Si Apple Pay/Google Pay no están disponibles, usar solo card y link
      if (err?.code === 'parameter_invalid_empty' || err?.message?.includes('payment_method_types') || err?.message?.includes('apple_pay') || err?.message?.includes('google_pay')) {
        console.warn('[StripeConnect] Apple Pay/Google Pay no disponibles, usando solo card y link');
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card', 'link'],
          payment_method_options: {
            link: {
              persistent_token: undefined,
            },
          },
          line_items: [{
            price_data: {
              currency: currency,
              product_data: { 
                name: productName,
                description: `Procesado por plataforma - Comisión: ${(commissionRate * 100).toFixed(1)}%`
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          }],
          payment_intent_data: {
            application_fee_amount: commissionAmount * 100,
            transfer_data: {
              destination: connectedAccountId,
            },
          },
          customer_email: customerEmail,
          success_url: successUrl,
          cancel_url: cancelUrl,
          locale: 'es',
          allow_promotion_codes: false,
          metadata: {
            connected_account: connectedAccountId,
            commission_rate: commissionRate.toString(),
            cart_data: JSON.stringify(cartData),
            user_id: userId || '',
          },
        });
      } else {
        throw err;
      }
    }

    console.log('[StripeConnect] Checkout session livemode:', (session as any).livemode, 'id:', session.id);
    return session;
  } catch (error) {
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
    const { data, error } = await supabaseAdmin
      .from('connected_accounts')
      .insert([{
        user_id: clientData.userId,
        stripe_account_id: clientData.stripeAccountId,
        email: clientData.email,
        business_name: clientData.businessName,
        country: clientData.country,
        commission_rate: clientData.commissionRate,
        status: clientData.country === 'AR' ? 'active' : 'pending',
        details_submitted: clientData.country === 'AR',
        charges_enabled: clientData.country !== 'AR',
        payouts_enabled: true,
        onboarding_completed: clientData.country === 'AR',
        created_at: new Date().toISOString(),
      }]);
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    throw error;
  }
}

export { stripe };
