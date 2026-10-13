import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { resolverAdminDesdeRequest } from '@/lib/adminAuth';
import { obtenerConfig } from '@/lib/config';
import resend from '@/lib/resend';
import { htmlEmailActualizacion } from '@/lib/emailTemplates';

export async function PATCH(request, contexto) {
  try {
    const params = await contexto.params;
    resolverAdminDesdeRequest(request);
    const { estado } = await request.json();
    const nuevoEstado = String(estado || '').trim().substring(0, 60);
    if (!nuevoEstado) throw new Error('Estado vacío.');

    const { data: pedido } = await supabaseAdmin.from('pedidos').select('*').eq('id', params.id).maybeSingle();
    if (!pedido) throw new Error('Pedido no encontrado.');

    if (String(pedido.estado || '').trim() === nuevoEstado) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseAdmin.from('pedidos').update({ estado: nuevoEstado }).eq('id', params.id);
    if (error) throw new Error(error.message);

    const emailComprador = String(pedido.email || '').trim();
    if (emailComprador) {
      try {
        const config = await obtenerConfig();
        const from = config.EmailRemitente || 'Tienda Demo <onboarding@resend.dev>';
        await resend.emails.send({
          from, to: emailComprador,
          subject: `Actualización de tu pedido #${params.id} · ${nuevoEstado}`,
          html: htmlEmailActualizacion(pedido.nombre || '', params.id, nuevoEstado, config),
        });
      } catch (err) {
        console.error('Error al enviar email de estado desde admin:', err.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, mensaje: err.message }, { status: err.status || 400 });
  }
}
