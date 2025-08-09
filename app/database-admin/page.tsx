'use client';

import { useState, useEffect } from 'react';
import { checkDuplicatesStatus, cleanupDuplicateSales } from '../../lib/cleanupDuplicates';
import { simpleConstraintCheck } from '../../lib/databaseConstraints';

interface DuplicateStatus {
  totalSales: number;
  uniqueGroups: number;
  duplicateGroups: number;
  duplicates: [string, number][];
}

interface ConstraintStatus {
  hasConstraint: boolean;
  working?: boolean;
  error?: string;
}

export default function DatabaseAdmin() {
  const [duplicateStatus, setDuplicateStatus] = useState<DuplicateStatus | null>(null);
  const [constraintStatus, setConstraintStatus] = useState<ConstraintStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ cleaned: number; errors: string[] } | null>(null);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const [dupStatus, conStatus] = await Promise.all([
        checkDuplicatesStatus(),
        simpleConstraintCheck()
      ]);
      
      setDuplicateStatus(dupStatus);
      setConstraintStatus(conStatus);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupDuplicateSales();
      setCleanupResult(result || { cleaned: 0, errors: ['No result returned'] });
      // Refrescar el estado después de la limpieza
      await checkStatus();
    } catch (error) {
      console.error('Error running cleanup:', error);
      setCleanupResult({ cleaned: 0, errors: [`Error: ${error}`] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🛠️ Administración de Base de Datos
        </h1>

        {/* Estado de Restricciones */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            🛡️ Estado de Restricciones de Duplicados
          </h2>
          
          {constraintStatus ? (
            <div className={`p-4 rounded-lg ${
              constraintStatus.hasConstraint 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center mb-2">
                <span className={`text-2xl mr-3 ${
                  constraintStatus.hasConstraint ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {constraintStatus.hasConstraint ? '✅' : '⚠️'}
                </span>
                <span className={`font-semibold ${
                  constraintStatus.hasConstraint ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {constraintStatus.hasConstraint 
                    ? 'Restricción única activa' 
                    : 'Sin restricción única'}
                </span>
              </div>
              
              {constraintStatus.error && (
                <p className="text-red-600 text-sm">{constraintStatus.error}</p>
              )}
              
              {!constraintStatus.hasConstraint && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>🔧 Acción requerida:</strong> Para prevenir duplicados automáticamente, 
                    ejecuta el siguiente comando en el SQL Editor de Supabase:
                  </p>
                  <code className="block bg-gray-100 p-2 rounded text-xs font-mono">
                    ALTER TABLE sales ADD CONSTRAINT unique_stripe_payment_intent_id UNIQUE (stripe_payment_intent_id);
                  </code>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
          )}
        </div>

        {/* Estado de Duplicados */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            📊 Estado Actual de Duplicados
          </h2>
          
          {duplicateStatus ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {duplicateStatus.totalSales}
                  </div>
                  <div className="text-sm text-blue-800">Total de ventas con Payment Intent</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {duplicateStatus.uniqueGroups}
                  </div>
                  <div className="text-sm text-green-800">Grupos únicos</div>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  duplicateStatus.duplicateGroups > 0 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <div className={`text-2xl font-bold mb-1 ${
                    duplicateStatus.duplicateGroups > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {duplicateStatus.duplicateGroups}
                  </div>
                  <div className={`text-sm ${
                    duplicateStatus.duplicateGroups > 0 ? 'text-red-800' : 'text-green-800'
                  }`}>
                    Grupos con duplicados
                  </div>
                </div>
              </div>

              {duplicateStatus.duplicates && duplicateStatus.duplicates.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-700 mb-2">⚠️ Duplicados detectados:</h3>
                  <div className="max-h-40 overflow-y-auto">
                    {duplicateStatus.duplicates.map(([paymentId, count], index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-red-50 border-l-4 border-red-400 mb-2">
                        <code className="text-sm font-mono text-red-800">{paymentId}</code>
                        <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">
                          {count} ventas
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
          )}
        </div>

        {/* Acciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            🔧 Acciones de Mantenimiento
          </h2>
          
          <div className="space-y-4">
            <button
              onClick={checkStatus}
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '🔄 Verificando...' : '🔍 Verificar Estado'}
            </button>
            
            {duplicateStatus && duplicateStatus.duplicateGroups > 0 && (
              <button
                onClick={runCleanup}
                disabled={isLoading}
                className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-0 md:ml-4"
              >
                {isLoading ? '🧹 Limpiando...' : '🧹 Limpiar Duplicados'}
              </button>
            )}
          </div>
          
          {cleanupResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Resultado de la limpieza:</h3>
              <div className="text-sm space-y-1">
                <p className="text-green-600">✅ {cleanupResult.cleaned} ventas duplicadas eliminadas</p>
                {cleanupResult.errors.length > 0 && (
                  <div className="text-red-600">
                    <p>❌ Errores:</p>
                    <ul className="list-disc list-inside ml-4">
                      {cleanupResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Información adicional */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Información importante:</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Las restricciones de base de datos previenen duplicados automáticamente</li>
            <li>La limpieza mantiene solo la venta más antigua de cada grupo duplicado</li>
            <li>Los duplicados pueden ocurrir por múltiples clicks durante el pago</li>
            <li>Una vez aplicada la restricción única, no se crearán más duplicados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
