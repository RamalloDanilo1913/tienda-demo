# Tienda Filial — Plataforma de e-commerce multivendedor

Sistema web de tienda online para una filial de Talleres de Córdoba: combina una tienda oficial con un marketplace donde los socios publican sus propios productos y servicios, todo moderado desde un panel de administración. Reemplaza una solución artesanal en Google Apps Script por una aplicación Next.js + Supabase.

> **Versión demo.** Este repositorio no contiene datos reales, claves ni configuración de producción, y usa marca genérica. La versión que corre en producción es privada porque maneja datos personales de usuarios.

![Tienda Online](/tienda.png)

## El problema que resuelve

Vender productos de la filial y los emprendimientos de sus socios implicaba spam en el grupo de WhatsApp, problemas al contar el stock, transferencias y comprobantes por WhatsApp y planillas sueltas. Esta plataforma ordena todo en un solo lugar:

- **El comprador** arma su carrito, paga por transferencia y sube el comprobante.
- **El socio vendedor** publica y gestiona sus productos y servicios, y ve sus propias ventas.
- **La organización** aprueba lo que se publica, controla pedidos y pagos, y administra promociones y configuración.

## Funcionalidades

### Tienda pública
- Catálogo de productos oficiales y de socios, con galería de imágenes.
- Variantes de producto (talle / color) con control de stock por variante.
- Carrito y checkout con pago por transferencia: el pedido se reparte automáticamente por vendedor, cada uno con su alias/CBU, y el comprador sube un comprobante por cada pago.
- Motor de promociones: porcentaje, 2x1 y "llevando N por $X", automáticas o por código, con vigencia por fechas y alcance por producto o global.
- Directorio de servicios ofrecidos por socios, con contacto directo por WhatsApp.
- Emails transaccionales automáticos al comprador, al administrador y a cada vendedor involucrado.

### Portal de socios vendedores
- Ingreso con DNI y clave.
- Alta y edición de productos y servicios, que quedan pendientes de aprobación.
- Gestión de stock por variante, baja y reactivación de publicaciones, y producto destacado.
- Consulta de sus ventas y de los comprobantes de pago de **sus** pedidos únicamente.

### Panel de administración
- Gestión de productos oficiales y sus variantes.
- Moderación de productos y servicios de socios, con email de aprobación automático.
- Gestión de pedidos con cambio de estado (con aviso por email al comprador) y acceso a comprobantes mediante links firmados temporales.
- Alta y edición de socios, promociones y configuración general de la tienda (nombre, colores, banner, alias, WhatsApp).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend / Backend | Next.js 15 (App Router), React 19, API Routes serverless |
| Base de datos y storage | Supabase (PostgreSQL, Storage) |
| Emails | Resend |
| Deploy | Vercel |

Sin librerías de autenticación externas: las sesiones son tokens firmados con HMAC-SHA256 guardados en cookies `httpOnly`.

## Decisiones de diseño

- **El cliente nunca envía precios ni totales.** El navegador solo manda identificadores y cantidades; el servidor recalcula precios, stock y descuentos a partir de la base de datos.
- **Subida de archivos sin pasar por el servidor.** Imágenes y comprobantes se suben directo desde el navegador a Supabase Storage con URLs firmadas de un solo uso, evitando los límites de tamaño de las funciones serverless.
- **Identificadores públicos de vendedor derivados con HMAC**, para que no se pueda inferir el DNI de un socio a partir de datos públicos.

## Seguridad

El proyecto pasó por una auditoría de seguridad previa a su publicación. Medidas implementadas:

- Sin secretos en el repositorio: toda la configuración va por variables de entorno (`.env.example`). La clave `service_role` de Supabase se usa solo del lado servidor.
- Sesiones con tokens firmados, comparación a tiempo constante, validación de algoritmo y expiración. Si falta el secreto, el servidor rechaza firmar o validar sesiones: no hay valores por defecto inseguros.
- Contraseñas con hash scrypt y sal individual, con migración transparente de hashes antiguos al iniciar sesión.
- Administradores definidos por variable de entorno (falla cerrado: si no está configurada, nadie es admin). Todas las rutas `/api/admin/*` exigen sesión válida del lado servidor.
- Portal de socios con verificación de propiedad: cada socio solo accede a sus pedidos y comprobantes.
- Bloqueo temporal por intentos fallidos en los logins y en la validación de códigos promocionales.
- Integridad de pedidos: precios, stock y promociones validados en el servidor; el stock solo se descuenta una vez validado todo el pedido.
- Escape de HTML en todos los emails que incluyen datos escritos por usuarios (previene XSS e inyección en mails).
- Validación de tipos y límites de entrada en los endpoints públicos; la configuración expuesta por la API pública usa lista blanca de claves.
- Comprobantes de pago: validación de formato de rutas, tipo y tamaño; bucket privado con links firmados temporales.
- Headers de seguridad (HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`), cookies `httpOnly` + `secure` + `sameSite=strict`.
- Mensajes de error genéricos hacia el público: los errores internos de base de datos o red no se exponen.

## Instalación

```bash
git clone https://github.com/RamalloDanilo1913/tienda-demo.git
cd tienda-demo
npm install
cp .env.example .env.local   # completá con tus propias credenciales
npm run dev
```

La app queda en http://localhost:3000. Requiere Node.js 18.18 o superior.

### Base de datos
Creá un proyecto en [Supabase](https://supabase.com) con las tablas que usa la aplicación: `productos_oficiales`, `productos_socios`, `servicios_socios`, `socios`, `stock_variantes`, `promociones`, `pedidos`, `config`, `login_attempts` y `admin_claves`. Creá además los buckets de Storage `productos-imagenes` (público) y `comprobantes` (**privado**).

Activá Row Level Security en todas las tablas: la aplicación accede con la clave `service_role` únicamente desde el servidor. Cargá en la tabla `config` los valores de la tienda (nombre, colores, banner, alias/CBU, WhatsApp, email de notificaciones).

Para crear un administrador, generá el hash de su clave:

```bash
node scripts/hash-clave.mjs "UnaContraseñaLarga"
```

y cargalo en la tabla `admin_claves` (`email`, `clave_hash`). Además, el email debe figurar en la variable `ADMIN_EMAILS`.

### Variables de entorno
Todas están documentadas en [`.env.example`](./.env.example). Las necesarias para el núcleo son las de Supabase, `JWT_SECRET`, `VENDOR_ID_SECRET` (ambos de al menos 32 caracteres y distintos entre sí; generalos con `openssl rand -hex 32`) y `ADMIN_EMAILS`. `RESEND_API_KEY` es necesaria para los emails. Las variables `SUPABASE_SOCIOS_*` y `SOCIOS_INTEGRACION_SECRET` son opcionales y corresponden a una integración con un sistema externo de socios.

### Deploy
Importá el repositorio en Vercel, cargá todas las variables de entorno y desplegá.

## Estructura

```
app/
  page.js         Tienda pública
  vender/         Portal de socios
  admin/          Panel de administración
  api/            Rutas de API (públicas, de socios y de admin)
components/       Componentes compartidos
lib/              Sesiones, hashes, pedidos, promociones, emails, validaciones
scripts/          Utilidades (generar hash de admin)
```

## Limitaciones conocidas

- El descuento de stock no es transaccional: dos compras simultáneas del último ítem podrían superar el stock. La mejora prevista es una función RPC en PostgreSQL.
- Hay bloqueo por intentos fallidos en logins y códigos promocionales, pero no un límite general de peticiones por IP; en producción se complementa con las reglas de rate limit del firewall de Vercel.
- Los pedidos sin comprobante descuentan stock igualmente: falta una reserva con tiempo de expiración. Por el momento los administradores prefieren manejarlo así.

## Autor

**Danilo Ramallo** — Estudiante de Ingeniería Electrónica · Desarrollo web y ciberseguridad

[LinkedIn](https://www.linkedin.com/in/danilo-ramallo-9877a6289)
