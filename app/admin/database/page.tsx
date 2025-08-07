"use client";
import { supabase } from '../../../lib/supabaseClient';

export default function ClearDatabasePage() {
  const clearDatabase = async () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los datos excepto los usuarios? Esta acción no se puede deshacer.')) {
      try {
        // Desactivar temporalmente las restricciones de clave externa
        await supabase.rpc('set_constraints_deferred');
        
        // Limpiar tablas en orden para evitar problemas de integridad referencial
        const tables = ['sales', 'products', 'categories'];
        
        for (const table of tables) {
          const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) throw error;
        }
        
        // Reactivar restricciones
        await supabase.rpc('set_constraints_immediate');
        
        alert('Datos borrados correctamente');
      } catch (error: unknown) {
        console.error('Error al limpiar la base de datos:', error);
        alert(`Error al limpiar la base de datos: ${(error as Error).message || 'Error desconocido'}`);
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administración de la Base de Datos</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-red-600 mb-4">Zona de Peligro</h2>
        <p className="mb-4 text-gray-700">
          Esta acción eliminará todos los datos de productos, categorías y ventas, pero mantendrá las cuentas de usuario.
        </p>
        <button
          onClick={clearDatabase}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Limpiar Base de Datos
        </button>
      </div>
    </div>
  );
}
