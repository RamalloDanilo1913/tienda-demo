import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';
import { esUrlImagenPropia } from '@/lib/storage';
import { obtenerConfig } from '@/lib/config';
import { notificarAdminNuevoProducto } from '@/lib/vendorNotify';
import { validarStockGeneralContraVariantes } from '@/lib/stockVariantes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const { data, error } = await supabaseAdmin
      .from('productos_socios').select('*').eq('dni_socio', dni).order('creado_en', { ascending: false });
    if (error) throw new Error(error.message);

    const productos = (data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: Number(p.precio) || 0,
      stock: Math.max(0, Number(p.stock) || 0),
      talles: (p.talles || []).join(','),
      colores: (p.colores || []).join(','),
      activo: !!p.activo,
      aprobado: !!p.aprobado,
      destacado: !!p.destacado,
      usaVariantes: !!p.usa_variantes,
    }));
    return NextResponse.json(productos);
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}

export async function POST(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const datos = await request.json();
    if (!datos) throw new Error('Datos inválidos.');
    if (datos.tcf_hp) throw new Error('No se pudo procesar la solicitud.');

    const nombreProducto = String(datos.nombreProducto || '').trim();
    const descripcion = String(datos.descripcion || '').trim();
    const precio = Number(datos.precio);
    const stock = Number(datos.stock);

    if (nombreProducto.length < 2) throw new Error('Ingresá un nombre válido.');
    if (isNaN(precio) || precio <= 0) throw new Error('Ingresá un precio válido.');
    if (isNaN(stock) || stock < 0) throw new Error('Ingresá un stock válido.');

    const talles = String(datos.talles || '').split(',').map((s) => s.trim()).filter(Boolean);
    const colores = String(datos.colores || '').split(',').map((s) => s.trim()).filter(Boolean);
    const usaVariantes = !!datos.usaVariantes;

    await validarStockGeneralContraVariantes(null, usaVariantes, stock, true);

    const urls = Array.isArray(datos.imagenes)
      ? datos.imagenes.filter((u) => esUrlImagenPropia(u)).slice(0, 6)
      : [];

    const { error } = await supabaseAdmin.from('productos_socios').insert({
      dni_socio: dni,
      nombre: nombreProducto.substring(0, 150),
      descripcion: descripcion.substring(0, 1000),
      precio, stock, talles, colores,
      imagenes: urls,
      aprobado: false, activo: true, destacado: false,
      usa_variantes: usaVariantes,
    });
    if (error) throw new Error(error.message);

    try {
      const config = await obtenerConfig();
      const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();
      await notificarAdminNuevoProducto(config, socio, nombreProducto);
    } catch (e) { }

    return NextResponse.json({ ok: true, mensaje: '¡Producto enviado! Quedó pendiente de aprobación por la administración.' });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
