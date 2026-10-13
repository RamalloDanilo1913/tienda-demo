import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';
import { esUrlImagenPropia } from '@/lib/storage';
import { obtenerConfig } from '@/lib/config';
import { notificarAdminProductoEditado } from '@/lib/vendorNotify';
import { validarStockGeneralContraVariantes } from '@/lib/stockVariantes';

async function obtenerProductoPropio(dni, id) {
  const { data } = await supabaseAdmin.from('productos_socios').select('*').eq('id', id).eq('dni_socio', dni).maybeSingle();
  if (!data) throw new Error('No encontramos ese producto o no te pertenece.');
  return data;
}

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const producto = await obtenerProductoPropio(dni, params.id);
    const cambios = await request.json();
    const update = {};

    if (cambios.hasOwnProperty('stock')) {
      const nuevoStock = Number(cambios.stock);
      if (isNaN(nuevoStock) || nuevoStock < 0) throw new Error('Stock inválido.');
      await validarStockGeneralContraVariantes(producto.id, producto.usa_variantes, nuevoStock, false);
      update.stock = nuevoStock;
    }
    if (cambios.hasOwnProperty('usaVariantes')) update.usa_variantes = !!cambios.usaVariantes;
    if (cambios.hasOwnProperty('activo')) update.activo = !!cambios.activo;
    if (cambios.hasOwnProperty('destacado')) {
      if (cambios.destacado) {
        await supabaseAdmin.from('productos_socios').update({ destacado: false }).eq('dni_socio', dni).neq('id', producto.id);
      }
      update.destacado = !!cambios.destacado;
    }

    const { error } = await supabaseAdmin.from('productos_socios').update(update).eq('id', producto.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}

export async function PUT(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const producto = await obtenerProductoPropio(dni, params.id);
    const datos = await request.json();
    if (datos.tcf_hp) throw new Error('No se pudo procesar la solicitud.');

    const nombreProducto = String(datos.nombreProducto || '').trim();
    const precio = Number(datos.precio);
    const stock = Number(datos.stock);
    if (nombreProducto.length < 2) throw new Error('Ingresá un nombre válido.');
    if (isNaN(precio) || precio <= 0) throw new Error('Ingresá un precio válido.');
    if (isNaN(stock) || stock < 0) throw new Error('Ingresá un stock válido.');

    const talles = String(datos.talles || '').split(',').map((s) => s.trim()).filter(Boolean);
    const colores = String(datos.colores || '').split(',').map((s) => s.trim()).filter(Boolean);
    const usaVariantes = datos.hasOwnProperty('usaVariantes') ? !!datos.usaVariantes : !!producto.usa_variantes;

    await validarStockGeneralContraVariantes(producto.id, usaVariantes, stock, false);

    const update = {
      nombre: nombreProducto.substring(0, 150),
      descripcion: String(datos.descripcion || '').trim().substring(0, 1000),
      precio, stock, talles, colores,
      usa_variantes: usaVariantes,
    };

    if (Array.isArray(datos.imagenes) && datos.imagenes.length) {
      const urls = datos.imagenes.filter((u) => esUrlImagenPropia(u)).slice(0, 6);
      if (urls.length) update.imagenes = urls;
    }

    let requiereReaprobacion = false;
    if (producto.aprobado) { update.aprobado = false; requiereReaprobacion = true; }

    const { error } = await supabaseAdmin.from('productos_socios').update(update).eq('id', producto.id);
    if (error) throw new Error(error.message);

    if (requiereReaprobacion) {
      try {
        const config = await obtenerConfig();
        const { data: socio } = await supabaseAdmin.from('socios').select('*').eq('dni', dni).maybeSingle();
        await notificarAdminProductoEditado(config, socio, nombreProducto);
      } catch (e) { }
    }

    return NextResponse.json({ ok: true, requiereReaprobacion });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
