"use client";
import { useState, useEffect } from 'react';
import { verifyDatabase } from '../lib/databaseDiagnostic';
import { LoadingSpinner } from './LoadingSpinner';

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



  if (status.hasErrors) {
    return (
      <div className="database-status errors">
        <p>Se encontraron errores al verificar la base de datos.</p>
        <button onClick={() => setStatus(prev => ({ ...prev, showDetails: !prev.showDetails }))}>
          {status.showDetails ? 'Ocultar detalles' : 'Mostrar detalles'}
        </button>
        {status.showDetails && (
          <ul>
            {status.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}
