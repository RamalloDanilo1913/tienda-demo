import supabaseAdmin from './supabaseAdmin';

export async function sumaVariantes(productoId) {
  const { data, error } = await supabaseAdmin.from('stock_variantes').select('stock').eq('producto_id', productoId);
  if (error) throw new Error('Error leyendo variantes: ' + error.message);
  return (data || []).reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
}

export async function validarStockGeneralContraVariantes(productoId, usaVariantes, nuevoStock, esProductoNuevo) {
  if (!usaVariantes) return;

  if (esProductoNuevo) {
    if (Number(nuevoStock) !== 0) {
      throw new Error('Para un producto nuevo con control de stock por variante, dejá el Stock general en 0 y cargalo después desde "Variantes".');
    }
    return;
  }

  const suma = await sumaVariantes(productoId);
  if (Number(nuevoStock) !== suma) {
    throw new Error(
      `El stock general (${nuevoStock}) no coincide con la suma de las variantes (${suma}). ` +
      'Para cambiarlo, editá el stock desde "Variantes" — el general se actualiza solo.'
    );
  }
}
