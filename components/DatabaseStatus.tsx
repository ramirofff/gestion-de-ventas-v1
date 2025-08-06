"use client";
import { useState, useEffect } from 'react';
import { verifyDatabase } from '../lib/databaseDiagnostic';

export function DatabaseStatus() {
  const [status, setStatus] = useState<{
    checking: boolean;
    hasErrors: boolean;
    errors: string[];
    showDetails: boolean;
  }>({
    checking: false,
    hasErrors: false,
    errors: [],
    showDetails: false
  });

  const checkDatabase = async () => {
    setStatus(prev => ({ ...prev, checking: true }));
    try {
      const results = await verifyDatabase();
      setStatus({
        checking: false,
        hasErrors: results.errors.length > 0,
        errors: results.errors,
        showDetails: false
      });
    } catch (error) {
      setStatus({
        checking: false,
        hasErrors: true,
        errors: [`Error al verificar base de datos: ${error}`],
        showDetails: false
      });
    }
  };

  useEffect(() => {
    // Auto-verificar la base de datos al cargar el componente
    checkDatabase();
  }, []);

  if (!status.hasErrors && !status.checking) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
        <div className="flex items-start">
          <div className="flex-1">
            <p className="font-bold">⚠️ Problema con la Base de Datos</p>
            <p className="text-sm">
              {status.checking 
                ? "Verificando base de datos..." 
                : "Hay problemas con la configuración de la base de datos."
              }
            </p>
            
            {status.hasErrors && (
              <button
                className="text-xs underline mt-2"
                onClick={() => setStatus(prev => ({ ...prev, showDetails: !prev.showDetails }))}
              >
                {status.showDetails ? "Ocultar detalles" : "Ver detalles"}
              </button>
            )}
            
            {status.showDetails && (
              <div className="mt-2 text-xs bg-red-50 p-2 rounded border-l-4 border-red-400">
                <p className="font-semibold mb-2">Errores encontrados:</p>
                <ul className="list-disc list-inside space-y-1">
                  {status.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold">💡 Solución:</p>
                  <p>Ejecutar el esquema de la base de datos en Supabase Dashboard:</p>
                  <code className="block text-xs mt-1 p-1 bg-gray-100 rounded">
                    database-schema.sql
                  </code>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setStatus(prev => ({ ...prev, hasErrors: false }))}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
