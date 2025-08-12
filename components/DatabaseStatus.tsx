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



  // Mostrar errores si existen
  if (status.hasErrors && status.errors.length > 0) {
    return (
      <div style={{ background: '#ffeaea', color: '#b00020', padding: '1em', borderRadius: 8, margin: '1em 0' }}>
        <strong>Errores en la base de datos:</strong>
        <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
          {status.errors.map((err, i) => (
            <li key={i} style={{ wordBreak: 'break-all' }}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  // Si está chequeando, mostrar spinner
  if (status.checking) {
    return <LoadingSpinner />;
  }

  // Si no hay errores ni está chequeando, no mostrar nada
  return null;
}
