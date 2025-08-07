'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ClientAccount, ClientAccountManager } from '../../../lib/client-accounts';

// Importar toda la lógica de la app principal
import { HomeComponent } from '../../page';

export default function ClientSpecificPage() {
  const params = useParams();
  const clientSlug = params.clientId as string;
  const [client, setClient] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClientBySlug();
  }, [clientSlug]);

  const loadClientBySlug = async () => {
    try {
      setLoading(true);
      
      // Buscar cliente por slug/business_name
      const clients = await ClientAccountManager.getAllActiveClients();
      const foundClient = clients.find(c => 
        c.business_name.toLowerCase().replace(/\s+/g, '-') === clientSlug ||
        c.id === clientSlug
      );

      if (foundClient) {
        setClient(foundClient);
      } else {
        setError('Cliente no encontrado');
      }
    } catch (err) {
      console.error('Error loading client:', err);
      setError('Error al cargar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Cliente No Encontrado</h1>
          <p className="text-gray-600 mb-4">
            No se encontró el cliente: <code className="bg-gray-100 px-2 py-1 rounded">{clientSlug}</code>
          </p>
          <a 
            href="/" 
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  // Renderizar la app principal con el cliente preseleccionado
  return (
    <div>
      {/* Banner identificador del cliente */}
      <div className="bg-blue-600 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div>
              <h1 className="font-bold text-lg">{client.business_name}</h1>
              <p className="text-blue-100 text-sm">{client.email} • {client.country}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Comisión de plataforma</p>
            <p className="font-bold">{client.platform_fee_percent}%</p>
          </div>
        </div>
      </div>

      {/* App principal con cliente preseleccionado */}
      <HomeComponent preSelectedClient={client} />
    </div>
  );
}
