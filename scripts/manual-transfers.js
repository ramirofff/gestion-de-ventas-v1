// scripts/manual-transfers.js
// Script para realizar transfers manuales a cuentas argentinas
// Ejecutar con: node scripts/manual-transfers.js

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getPendingManualTransfers() {
  console.log('🔍 Buscando comisiones pendientes de transfer manual...');
  
  const { data: pendingCommissions, error } = await supabase
    .from('commission_sales')
    .select(`
      *,
      connected_account:connected_accounts (
        stripe_account_id,
        business_name,
        country,
        email
      )
    `)
    .eq('status', 'completed')
    .is('transfer_id', null)
    .eq('connected_accounts.country', 'AR');

  if (error) {
    console.error('❌ Error consultando base de datos:', error);
    return [];
  }

  console.log(`📊 Encontradas ${pendingCommissions?.length || 0} comisiones pendientes`);
  return pendingCommissions || [];
}

async function createManualTransfer(commission) {
  const { connected_account } = commission;
  
  if (!connected_account?.stripe_account_id.startsWith('acct_')) {
    console.log(`⚠️ Omitiendo cuenta virtual: ${connected_account?.business_name}`);
    return null;
  }

  try {
    console.log(`💸 Creando transfer para ${connected_account.business_name}`);
    console.log(`   Monto neto: $${commission.net_amount}`);
    console.log(`   Cuenta: ${connected_account.stripe_account_id}`);
    
    const transfer = await stripe.transfers.create({
      amount: Math.round(commission.net_amount * 100), // Convertir a centavos
      currency: 'usd',
      destination: connected_account.stripe_account_id,
      metadata: {
        commission_sale_id: commission.id,
        business_name: connected_account.business_name,
        original_payment_intent: commission.stripe_payment_intent_id,
        manual_transfer: 'true'
      }
    });

    // Actualizar registro con transfer ID
    await supabase
      .from('commission_sales')
      .update({ transfer_id: transfer.id })
      .eq('id', commission.id);

    console.log(`✅ Transfer exitoso: ${transfer.id}`);
    return transfer;

  } catch (error) {
    console.error(`❌ Error creando transfer para ${connected_account.business_name}:`, error.message);
    return null;
  }
}

async function generateTransferReport(transfers) {
  const successful = transfers.filter(t => t !== null);
  const totalAmount = successful.reduce((sum, t) => sum + (t.amount / 100), 0);
  
  console.log('\n📋 REPORTE DE TRANSFERS MANUALES');
  console.log('================================');
  console.log(`✅ Transfers exitosos: ${successful.length}`);
  console.log(`💰 Monto total transferido: $${totalAmount.toFixed(2)}`);
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
  
  if (successful.length > 0) {
    console.log('\n🎯 Detalle de transfers:');
    successful.forEach((transfer, idx) => {
      console.log(`${idx + 1}. ${transfer.id} - $${(transfer.amount / 100).toFixed(2)}`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando proceso de transfers manuales...\n');
    
    // 1. Obtener comisiones pendientes
    const pendingCommissions = await getPendingManualTransfers();
    
    if (pendingCommissions.length === 0) {
      console.log('✨ No hay transfers manuales pendientes');
      return;
    }

    // 2. Mostrar resumen antes de procesar
    console.log('\n💰 RESUMEN ANTES DE PROCESAR:');
    console.log('============================');
    pendingCommissions.forEach((commission, idx) => {
      const account = commission.connected_account;
      console.log(`${idx + 1}. ${account?.business_name} (${account?.country})`);
      console.log(`   Comisión: $${commission.commission_amount} | Neto: $${commission.net_amount}`);
      console.log(`   Producto: ${commission.product_name}`);
      console.log('');
    });

    // 3. Confirmar procesamiento
    console.log('¿Proceder con los transfers? (Ctrl+C para cancelar)');
    console.log('Esperando 5 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Procesar transfers
    console.log('🔄 Procesando transfers...\n');
    const transfers = [];
    
    for (const commission of pendingCommissions) {
      const transfer = await createManualTransfer(commission);
      transfers.push(transfer);
      
      // Pausa entre transfers para evitar límites de rate
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 5. Generar reporte
    await generateTransferReport(transfers);
    
    console.log('\n🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('💥 Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  getPendingManualTransfers,
  createManualTransfer,
  generateTransferReport
};
