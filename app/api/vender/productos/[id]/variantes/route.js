import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const { data: producto } = await supabaseAdmin
      .from('productos_socios').select('id').eq('id', params.id).eq('dni_socio', dni).maybeSingle();
    if (!producto) throw new Error('No encontramos ese producto o no te pertenece.');

    const { data, error } = await supabaseAdmin.from('stock_variantes').select('*').eq('producto_id', params.id);
    if (error) throw new Error(error.message);

    return NextResponse.json((data || []).map((v) => ({
      talle: v.talle || '', color: v.color || '', stock: Math.max(0, Number(v.stock) || 0),
    })));
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 400 });
  }
}

export async function PUT(request, contexto) {
  try {
    const params = await contexto.params;
    const dni = resolverDniDesdeRequest(request);
    const { variantes } = await request.json();
    if (!Array.isArray(variantes)) throw new Error('Datos inválidos.');

    const { data: producto } = await supabaseAdmin
      .from('productos_socios').select('*').eq('id', params.id).eq('dni_socio', dni).maybeSingle();
    if (!producto) throw new Error('No encontramos ese producto o no te pertenece.');

    const tallesOk = producto.talles || [];
    const coloresOk = producto.colores || [];

    for (const v of variantes) {
      const t = String(v.talle || '').trim();
      const c = String(v.color || '').trim();
      const s = Number(v.stock);
      if (isNaN(s) || s < 0) throw new Error(`Stock inválido en ${t || '-'}/${c || '-'}.`);
      if (tallesOk.length && t && !tallesOk.includes(t)) throw new Error(`Talle "${t}" no declarado en el producto.`);
      if (coloresOk.length && c && !coloresOk.includes(c)) throw new Error(`Color "${c}" no declarado en el producto.`);
    }

    let total = 0;
    for (const v of variantes) {
      const t = String(v.talle || '').trim();
      const c = String(v.color || '').trim();
      const s = Math.max(0, Math.floor(Number(v.stock) || 0));
      total += s;
      const { error } = await supabaseAdmin
        .from('stock_variantes')
        .upsert({ producto_id: params.id, talle: t, color: c, stock: s }, { onConflict: 'producto_id,talle,color' });
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from('productos_socios').update({ stock: total, usa_variantes: true }).eq('id', params.id);
    return NextResponse.json({ ok: true, totalStock: total });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
