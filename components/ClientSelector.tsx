'use client';

import { useState, useEffect } from 'react';
import { ClientAccount, ClientAccountManager } from '../lib/client-accounts';

interface ClientSelectorProps {
  onClientSelect: (client: ClientAccount | null) => void;
  selectedClientId?: string;
}

export function ClientSelector({ onClientSelect, selectedClientId }: ClientSelectorProps) {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    email: '',
    business_name: '',
    country: 'AR'
  });

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const activeClients = await ClientAccountManager.getAllActiveClients();
      setClients(activeClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await ClientAccountManager.createClient({
        user_id: 'temp-' + Date.now(), // Temporal hasta tener auth real
        stripe_account_id: 'temp-account-' + Date.now(), // Temporal
        email: newClientData.email,
        business_name: newClientData.business_name,
        country: newClientData.country
      });

      if (result.success && result.client) {
        setClients(prev => [result.client!, ...prev]);
        setNewClientData({ email: '', business_name: '', country: 'AR' });
        setShowAddForm(false);
        onClientSelect(result.client);
      } else {
        alert('Error al crear cliente: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Error al crear cliente');
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Cliente (opcional)
      </label>
      
      <div className="space-y-2">
        {/* Selector de cliente */}
        <select
          value={selectedClientId || ''}
          onChange={(e) => {
            const clientId = e.target.value;
            const client = clientId ? clients.find(c => c.id === clientId) || null : null;
            onClientSelect(client);
          }}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Sin cliente específico</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {(client.business_name ?? '')} ({client.email})
            </option>
          ))}
        </select>

        {/* Botón para agregar cliente */}
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + Agregar nuevo cliente
        </button>
      </div>

      {/* Cliente seleccionado info */}
      {selectedClient && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
          <strong>{selectedClient.business_name ?? ''}</strong>
          <br />
          {selectedClient.email} • {selectedClient.country}
          <br />
          Comisión: {selectedClient.platform_fee_percent}%
        </div>
      )}

      {/* Formulario para agregar cliente */}
      {showAddForm && (
        <form onSubmit={handleAddClient} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del negocio
            </label>
            <input
              type="text"
              value={newClientData.business_name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, business_name: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              País
            </label>
            <select
              value={newClientData.country}
              onChange={(e) => setNewClientData(prev => ({ ...prev, country: e.target.value }))}
              className="w-full p-2 text-sm border border-gray-300 rounded"
            >
              <option value="AR">Argentina 🇦🇷</option>
              <option value="US">Estados Unidos 🇺🇸</option>
              <option value="MX">México 🇲🇽</option>
              <option value="CL">Chile 🇨🇱</option>
              <option value="CO">Colombia 🇨🇴</option>
            </select>
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Crear Cliente
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="text-sm text-gray-500 mt-2">
          Cargando clientes...
        </div>
      )}
    </div>
  );
}
