"use client";
import { useState } from 'react';
import ResetDatabaseButton from './reset-database';
import { AuthGuard } from '../../components/AuthGuard';
import { Boxes, RefreshCcw, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Boxes className="h-6 w-6" /> Panel de Administración
        </h1>
        
        <div className="grid gap-8">
          <section className="p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-yellow-200 dark:border-zinc-700">
            <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" /> Zona de Peligro
            </h2>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
              <p className="text-red-800 dark:text-red-200 mb-2">
                Las siguientes acciones son irreversibles y pueden causar pérdida de datos.
                Úsalas con extrema precaución.
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <RefreshCcw className="h-5 w-5" /> Reiniciar Base de Datos
                </h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Elimina todos los productos, categorías, y ventas. Los usuarios permanecerán intactos.
                </p>
                
                {!showConfirmation ? (
                  <button 
                    onClick={() => setShowConfirmation(true)}
                    className="bg-red-100 text-red-800 hover:bg-red-200 px-4 py-2 rounded-lg font-medium"
                  >
                    Mostrar botón de reinicio
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <ResetDatabaseButton />
                    <button 
                      onClick={() => setShowConfirmation(false)}
                      className="text-zinc-600 hover:text-zinc-800 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}
