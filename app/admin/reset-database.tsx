"use client";
import { supabase } from '../../lib/supabaseClient';

export async function resetDatabaseData() {
  try {
    // Eliminar todos los productos
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .not('id', 'is', null);
    
    if (productsError) throw productsError;
    console.log('✓ Productos eliminados');
    
    // Eliminar todas las categorías
    const { error: categoriesError } = await supabase
      .from('categories')
      .delete()
      .not('id', 'is', null);
    
    if (categoriesError) throw categoriesError;
    console.log('✓ Categorías eliminadas');
    
    // Eliminar todas las ventas (si existe la tabla)
    try {
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .not('id', 'is', null);
      
      if (!salesError) console.log('✓ Ventas eliminadas');
    } catch (e) {
      console.log('Tabla de ventas no encontrada o no accesible');
    }
    
    // Eliminar detalles de ventas (si existe la tabla)
    try {
      const { error: salesDetailsError } = await supabase
        .from('sales_details')
        .delete()
        .not('id', 'is', null);
      
      if (!salesDetailsError) console.log('✓ Detalles de ventas eliminados');
    } catch (e) {
      console.log('Tabla de detalles de ventas no encontrada o no accesible');
    }
    
    return { success: true, message: 'Datos eliminados correctamente' };
  } catch (error: any) {
    console.error('Error al eliminar datos:', error);
    return { success: false, error };
  }
}

// Componente para mostrar un botón de reinicio
export default function ResetDatabaseButton() {
  const handleReset = async () => {
    if (confirm('¿Estás seguro de que quieres eliminar TODOS los datos (excepto usuarios)? Esta acción no se puede deshacer.')) {
      const result = await resetDatabaseData();
      if (result.success) {
        alert('Datos eliminados correctamente. Por favor, recarga la página.');
      } else {
        alert('Error al eliminar los datos: ' + (result.error?.message || 'Desconocido'));
      }
    }
  };

  return (
    <button
      onClick={handleReset}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold"
    >
      Reiniciar Base de Datos
    </button>
  );
}
