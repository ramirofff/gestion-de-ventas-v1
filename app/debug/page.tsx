"use client";
import { useState } from 'react';
import { initializeDatabase, getCategoriesForUser, createCategory } from '../../lib/database';
import { supabase } from '../../lib/supabaseClient';
import { Category } from '../../types/category';

export default function DatabaseDebugPage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearLog = () => {
    setLog([]);
  };

  const checkAuth = async () => {
    try {
      addLog('Verificando autenticación...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addLog(`❌ Error de autenticación: ${error.message}`);
        return;
      }
      
      if (user) {
        addLog(`✅ Usuario autenticado: ${user.email} (ID: ${user.id})`);
      } else {
        addLog('❌ No hay usuario autenticado');
      }
    } catch (error) {
      addLog(`❌ Error inesperado: ${error}`);
    }
  };

  const checkDatabase = async () => {
    try {
      setLoading(true);
      addLog('Iniciando diagnóstico de base de datos...');
      
      const result = await initializeDatabase();
      if (result) {
        addLog('✅ Base de datos inicializada correctamente');
      } else {
        addLog('❌ Problema al inicializar base de datos');
      }
      
    } catch (error) {
      addLog(`❌ Error al verificar base de datos: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkCategories = async () => {
    try {
      setLoading(true);
      addLog('Verificando categorías...');
      
      const categories = await getCategoriesForUser();
      addLog(`✅ Categorías encontradas: ${categories.length}`);
      
      categories.forEach((cat: Category, index: number) => {
        addLog(`  ${index + 1}. ${cat.name} (ID: ${cat.id})`);
      });
      
    } catch (error) {
      addLog(`❌ Error al obtener categorías: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createTestCategory = async () => {
    try {
      setLoading(true);
      addLog('Creando categoría de prueba...');
      
      const testName = `Prueba ${Date.now()}`;
      const result = await createCategory(testName);
      
      if (result && result[0]) {
        addLog(`✅ Categoría creada: ${result[0].name} (ID: ${result[0].id})`);
      } else {
        addLog('❌ No se pudo crear la categoría');
      }
      
    } catch (error) {
      addLog(`❌ Error al crear categoría: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostic = async () => {
    clearLog();
    addLog('=== DIAGNÓSTICO COMPLETO ===');
    
    await checkAuth();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkDatabase();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkCategories();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await createTestCategory();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkCategories();
    
    addLog('=== DIAGNÓSTICO COMPLETADO ===');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-900 mb-6">
          Diagnóstico de Base de Datos
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-4">
            Herramientas de Diagnóstico
          </h2>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={checkAuth}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Verificar Autenticación
            </button>
            
            <button
              onClick={checkDatabase}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Verificar Base de Datos
            </button>
            
            <button
              onClick={checkCategories}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Verificar Categorías
            </button>
            
            <button
              onClick={createTestCategory}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Crear Categoría de Prueba
            </button>
            
            <button
              onClick={runFullDiagnostic}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-bold"
            >
              Diagnóstico Completo
            </button>
            
            <button
              onClick={clearLog}
              disabled={loading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
            >
              Limpiar Log
            </button>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-2 text-yellow-700">Procesando...</span>
            </div>
          )}
        </div>
        
        <div className="bg-black rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-green-400 mb-4">
            Log de Diagnóstico
          </h2>
          
          <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-gray-400">
                Haz clic en cualquier botón para comenzar el diagnóstico...
              </p>
            ) : (
              log.map((entry, index) => (
                <div key={index} className={
                  entry.includes('❌') ? 'text-red-400' :
                  entry.includes('✅') ? 'text-green-400' :
                  entry.includes('===') ? 'text-yellow-400 font-bold' :
                  'text-gray-300'
                }>
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
