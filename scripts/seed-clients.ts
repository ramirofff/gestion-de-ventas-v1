import { supabase } from '../lib/supabaseClient';

// Función para crear clientes de ejemplo
async function seedClients() {
  const clients = [
    {
      user_id: 'juan-pizzeria-001',
      stripe_account_id: 'acct_juan_pizzeria_test',
      email: 'juan@pizzerianapoli.com',
      business_name: 'Pizzeria Napoli',
      country: 'AR',
      platform_fee_percent: 3.0
    },
    {
      user_id: 'maria-restaurant-002', 
      stripe_account_id: 'acct_maria_restaurant_test',
      email: 'maria@restaurantelaplata.com',
      business_name: 'Restaurant La Plata',
      country: 'AR',
      platform_fee_percent: 2.5
    },
    {
      user_id: 'carlos-tienda-003',
      stripe_account_id: 'acct_carlos_tienda_test', 
      email: 'carlos@tiendadeportiva.com',
      business_name: 'Tienda Deportiva Carlos',
      country: 'AR',
      platform_fee_percent: 3.5
    },
    {
      user_id: 'ana-cafe-004',
      stripe_account_id: 'acct_ana_cafe_test',
      email: 'ana@cafecentral.com', 
      business_name: 'Cafe Central',
      country: 'AR',
      platform_fee_percent: 3.0
    }
  ];

  console.log('🌱 Creando clientes de ejemplo...');
  
  for (const client of clients) {
    try {
      const { data, error } = await supabase
        .from('client_accounts')
        .insert([client])
        .select()
        .single();
        
      if (error) {
        console.error(`❌ Error creando cliente ${client.business_name}:`, error);
      } else {
        console.log(`✅ Cliente creado: ${client.business_name} (ID: ${data.id})`);
      }
    } catch (err) {
      console.error(`❌ Error insertando cliente ${client.business_name}:`, err);
    }
  }
  
  console.log('🎉 Seeding completado!');
}

// Ejecutar si se llama directamente
if (typeof window === 'undefined') {
  seedClients().then(() => {
    console.log('✨ Proceso completado');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Error en seeding:', error);
    process.exit(1);
  });
}

export { seedClients };
