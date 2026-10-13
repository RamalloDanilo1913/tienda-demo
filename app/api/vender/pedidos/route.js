import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverDniDesdeRequest } from '@/lib/vendorAuth';
import { idsDeVendedor } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const dni = resolverDniDesdeRequest(request);
    const misVendorIds = idsDeVendedor(dni);

    const { data, error } = await supabaseAdmin
      .from('pedidos').select('*').order('fecha', { ascending: false }).limit(300);
    if (error) throw new Error(error.message);

    const misVentas = [];
    (data || []).forEach((pedido) => {
      const pagos = pedido.pagos || [];
      const miGrupo = pagos.find((g) => misVendorIds.includes(g.vendorId));
      if (!miGrupo) return;
      misVentas.push({
        id: pedido.id,
        fecha: pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-AR') : '',
        estado: pedido.estado,
        monto: miGrupo.monto || 0,
        comprobanteRecibido: !!miGrupo.comprobanteUrl,
        comprobantePath: miGrupo.comprobanteUrl || null,
        compradorNombre: pedido.nombre,
        compradorTelefono: pedido.telefono,
      });
    });

    return NextResponse.json(misVentas);
  } catch (err) {
    return NextResponse.json({ mensaje: err.message }, { status: err.status || 401 });
  }
}
