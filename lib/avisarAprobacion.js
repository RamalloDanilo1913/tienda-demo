export async function avisarVendedorAprobado(dni, activo, tipo) {
  const url = process.env.SUPABASE_SOCIOS_URL;
  const key = process.env.SUPABASE_SOCIOS_PUBLISHABLE_KEY;
  const secret = process.env.SOCIOS_INTEGRACION_SECRET;
  if (!url || !key || !secret) {
    console.error('Falta configurar SUPABASE_SOCIOS_URL, SUPABASE_SOCIOS_PUBLISHABLE_KEY o SOCIOS_INTEGRACION_SECRET.');
    return;
  }

  try {
    const respuesta = await fetch(`${url}/rest/v1/rpc/marcar_vendedor_aprobado`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secret, p_dni: dni, p_activo: activo, p_tipo: tipo }),
    });
    if (!respuesta.ok) {
      console.error('No se pudo avisar al portal de socios:', respuesta.status, await respuesta.text());
    }
  } catch (e) {
    console.error('Error avisando al portal de socios:', e.message);
  }
}
