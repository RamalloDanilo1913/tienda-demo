import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { validarArchivo } from '@/lib/validaciones';
import { guardarImagenProducto } from '@/lib/storage';
import { validarStockGeneralContraVariantes } from '@/lib/stockVariantes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    resolverAdminDesdeRequest(request);
    const { data, error } = await supabaseAdmin.from('productos_oficiales').select('*').order('creado_en', { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json((data || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: Number(p.precio) || 0,
      stock: Number(p.stock) || 0,
      talles: (p.talles || []).join(','),
      colores: (p.colores || []).join(','),
      imagenURL: (p.imagenes || []).join(', '),
      activo: !!p.activo,
      usaVariantes: !!p.usa_variantes,
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
    if (nombre.length < 2) throw new Error('Nombre demasiado corto.');
    const precio = Number(datos.precio);
    const stock = Number(datos.stock);
    if (isNaN(precio) || precio < 0) throw new Error('Precio inválido.');
    if (isNaN(stock) || stock < 0) throw new Error('Stock inválido.');

    const talles = String(datos.talles || '').split(',').map((s) => s.trim()).filter(Boolean);
    const colores = String(datos.colores || '').split(',').map((s) => s.trim()).filter(Boolean);
    const usaVariantes = !!datos.usaVariantes;

    await validarStockGeneralContraVariantes(datos.id || null, usaVariantes, stock, !datos.id);

    let urls = String(datos.imagenURL || '').split(',').map((u) => u.trim()).filter(Boolean);

    if (datos.imagenBase64 && datos.imagenBase64.data) {
      validarArchivo(datos.imagenBase64, ['image/'], 5 * 1024 * 1024);
      const url1 = await guardarImagenProducto(datos.imagenBase64, 'oficial_' + (datos.id || 'new') + '_1');
      if (url1) urls.push(url1);
    }
    if (Array.isArray(datos.imagenesBase64Extra)) {
      for (let idx = 0; idx < datos.imagenesBase64Extra.length; idx++) {
        const img = datos.imagenesBase64Extra[idx];
        if (!img || !img.data) continue;
        try {
          validarArchivo(img, ['image/'], 5 * 1024 * 1024);
          const urlExtra = await guardarImagenProducto(img, 'oficial_' + (datos.id || 'new') + '_' + (idx + 2));
          if (urlExtra) urls.push(urlExtra);
        } catch (e) { }
      }
    }

    const registro = {
      nombre: nombre.substring(0, 150),
      descripcion: String(datos.descripcion || '').substring(0, 1000),
      precio, stock, talles, colores,
      imagenes: urls,
      activo: !!datos.activo,
      usa_variantes: usaVariantes,
    };

    if (datos.id) {
      const { error } = await supabaseAdmin.from('productos_oficiales').update(registro).eq('id', datos.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from('productos_oficiales').insert(registro);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
