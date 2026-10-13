import supabaseAdmin from './supabaseAdmin';

const CLAVES_CONFIG_PUBLICAS = [
  'NombreTienda',
  'AliasTransferencia',
  'CBU',
  'WhatsAppContacto',
  'ColorPrimario',
  'ColorSecundario',
  'ColorAcento',
  'ColorBordo',
  'ImagenBanner',
];

export async function obtenerConfigPublica() {
  const config = await obtenerConfig();
  const publica = {};
  CLAVES_CONFIG_PUBLICAS.forEach((k) => {
    if (config[k] !== undefined) publica[k] = config[k];
  });
  return publica;
}

export async function obtenerConfig() {
  const { data, error } = await supabaseAdmin.from('config').select('*');
  if (error) throw new Error('Error leyendo config: ' + error.message);
  const config = {};
  (data || []).forEach((row) => {
    if (row.clave) config[row.clave] = row.valor;
  });
  return config;
}
