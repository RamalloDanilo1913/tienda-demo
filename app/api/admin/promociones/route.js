import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const { data, error } = await supabaseAdmin.from('promociones').select('*').order('creado_en', { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json((data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigo: p.codigo || '',
      tipo: p.tipo,
      valor: p.valor || 0,
      cantidad: p.cantidad || '',
      alcance: p.alcance,
      productoId: p.producto_id || '',
      activo: !!p.activo,
      fechaInicio: p.fecha_inicio ? p.fecha_inicio.substring(0, 10) : '',
      fechaFin: p.fecha_fin ? p.fecha_fin.substring(0, 10) : '',
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    resolverAdminDesdeRequest(request);
    const datos = await request.json();
    if (!datos) throw new Error('Datos inválidos.');

    const nombre = String(datos.nombre || '').trim();
    if (nombre.length < 2) throw new Error('Ingresá un nombre para la promoción.');

    const tipo = (datos.tipo === '2X1' || datos.tipo === 'NXPRECIO') ? datos.tipo : 'PORCENTAJE';
    const alcance = (tipo === '2X1' || tipo === 'NXPRECIO') ? 'PRODUCTO' : (datos.alcance === 'PRODUCTO' ? 'PRODUCTO' : 'TODOS');

    let valor = 0;
    let cantidad = null;
    if (tipo === 'PORCENTAJE') {
      valor = Number(datos.valor);
      if (isNaN(valor) || valor <= 0 || valor > 100) throw new Error('El porcentaje tiene que ser entre 1 y 100.');
    } else if (tipo === 'NXPRECIO') {
      cantidad = Math.floor(Number(datos.cantidad));
      if (isNaN(cantidad) || cantidad < 2) throw new Error('La cantidad ("llevando...") tiene que ser 2 o más.');
      valor = Number(datos.valor);
      if (isNaN(valor) || valor <= 0) throw new Error('Ingresá el precio total de la promoción.');
    }

    let productoId = null;
    if (alcance === 'PRODUCTO') {
      productoId = datos.productoId || null;
      if (!productoId) throw new Error('Elegí un producto para esta promoción.');
    }

    if (tipo === 'NXPRECIO' && productoId) {
      const { data: producto } = await supabaseAdmin.from('productos_oficiales').select('precio').eq('id', productoId).maybeSingle();
      if (producto && valor >= cantidad * Number(producto.precio || 0)) {
        throw new Error(`El precio de la promo ($${valor}) tiene que ser menor a llevar ${cantidad} unidades al precio normal ($${cantidad * Number(producto.precio || 0)}).`);
      }
    }

    const codigo = String(datos.codigo || '').trim().toUpperCase() || null;

    if (codigo) {
      const { data: existente } = await supabaseAdmin
        .from('promociones').select('id').eq('codigo', codigo).neq('id', datos.id || '00000000-0000-0000-0000-000000000000').maybeSingle();
      if (existente) throw new Error('Ya existe otra promoción con ese código.');
    }

    const registro = {
      nombre: nombre.substring(0, 150),
      codigo,
      tipo,
      valor,
      cantidad,
      alcance,
      producto_id: productoId,
      activo: !!datos.activo,
      fecha_inicio: datos.fechaInicio ? new Date(datos.fechaInicio).toISOString() : null,
      fecha_fin: datos.fechaFin ? new Date(datos.fechaFin).toISOString() : null,
    };

    if (datos.id) {
      const { error } = await supabaseAdmin.from('promociones').update(registro).eq('id', datos.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from('promociones').insert(registro);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
