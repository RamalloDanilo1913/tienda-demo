# 🛍️ Tienda Multivendedor — Demo

Plataforma de e-commerce **multi-vendedor** para una asociación de socios. Combina una tienda oficial con un marketplace donde los socios publican sus propios productos y servicios, todo moderado desde un panel de administración.

Es un proyecto real, puesto en producción, migrado desde una solución anterior basada en Google Apps Script hacia un stack moderno (Next.js + Supabase). Este repositorio es una **versión demo** del código de producción: sin credenciales, sin datos personales, con marca genérica y valores de ejemplo.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## ✨ Funcionalidades

### 🏪 Tienda pública (`/`)
- Catálogo de productos oficiales y de socios, con galería de imágenes.
- Carrito y checkout con **pago por transferencia**: el comprador sube el comprobante y el pedido se reparte automáticamente por vendedor (cada uno con su alias/CBU).
- **Variantes de producto** (talle / color) con control de stock por variante.
- **Motor de promociones**: porcentaje, 2x1 y "llevando N por $X", automáticas o por código, con vigencia por fechas y alcance por producto o global.
- Directorio de **servicios** ofrecidos por socios, con contacto directo.
- Emails transaccionales automáticos al comprador, al administrador y a cada vendedor involucrado.

### 🧑‍💼 Portal de socios (`/vender`)
- Login por DNI y clave.
- Alta y edición de productos y servicios (quedan pendientes de aprobación).
- Gestión de stock por variante, baja/reactivación y producto destacado.
- Consulta de sus ventas y de los comprobantes de pago de **sus** pedidos.

### 🔐 Panel de administración (`/admin`)
- Gestión de productos oficiales y sus variantes.
- Moderación de productos y servicios de socios, con email de aprobación automático.
- Gestión de pedidos con cambio de estado (con aviso por email al comprador) y acceso a comprobantes mediante links firmados temporales.
- Alta y edición de socios/vendedores, promociones y configuración general de la tienda.

---

## 🧱 Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + React |
| Backend | API Routes de Next.js (serverless) |
| Base de datos | Supabase (PostgreSQL) |
| Archivos | Supabase Storage (bucket público para imágenes, privado para comprobantes) |
| Emails | Resend |
| Hosting | Vercel |

Sin librerías de autenticación externas: las sesiones son tokens firmados con HMAC-SHA256 guardados en cookies `httpOnly`.

---

## 🏗️ Arquitectura

```
app/
├── page.js                  Tienda pública
├── vender/                  Portal de socios
├── admin/                   Panel de administración
└── api/
    ├── tienda/              Catálogo público
    ├── pedidos/             Checkout y subida de comprobantes
    ├── promos/validar/      Validación de códigos promocionales
    ├── vender/*             API autenticada de socios
    └── admin/*              API autenticada de administradores
components/                  Componentes compartidos
lib/                         Lógica de negocio y seguridad
├── session.js               Tokens firmados
├── crypto.js                Hash de claves (scrypt) e IDs públicos
├── adminAuth.js             Autenticación de administradores
├── vendorAuth.js            Autenticación de socios
├── pedidos.js / promos.js   Stock, precios y descuentos (calculados en el servidor)
├── emailTemplates.js        Plantillas de email
└── rateLimit.js             Bloqueo por intentos fallidos
scripts/
└── hash-clave.mjs           Genera el hash de una clave de administrador
```

**Decisiones de diseño**

- **El cliente nunca envía precios ni totales.** El navegador solo manda identificadores y cantidades; el servidor recalcula precios, stock y descuentos a partir de la base de datos.
- **Subida de archivos sin pasar por el servidor.** Imágenes y comprobantes se suben directo desde el navegador a Supabase Storage con URLs firmadas de un solo uso, evitando los límites de tamaño de las funciones serverless.

---

## 🔒 Seguridad

El proyecto pasó por una auditoría de seguridad previa a su publicación. Medidas implementadas:

- **Sesiones**: tokens firmados con comparación en tiempo constante, validación de algoritmo y expiración. Si falta el secreto, el servidor rechaza firmar o validar sesiones (no hay valores por defecto inseguros).
- **Contraseñas**: hash con **scrypt** y sal individual, con migración transparente de hashes antiguos al iniciar sesión.
- **Control de acceso**: administradores definidos por variable de entorno (falla cerrado) y verificación de propiedad de los recursos en el portal de socios.
- **Fuerza bruta**: bloqueo temporal por intentos fallidos en los logins y en la validación de códigos promocionales.
- **Privacidad**: los identificadores públicos de vendedores se derivan con HMAC y un secreto del servidor, de modo que no se puede inferir el DNI a partir de datos públicos. La configuración expuesta por la API pública usa una lista blanca de claves.
- **Inyección**: todo dato ingresado por usuarios se escapa antes de incluirse en emails HTML.
- **Integridad de pedidos**: precios, stock y promociones validados en el servidor; el stock solo se descuenta una vez validado todo el pedido.
- **Archivos**: validación de formato de rutas, tipo y tamaño; bucket de comprobantes privado con links temporales.
- **Cabeceras HTTP**: `X-Frame-Options`, `X-Content-Type-Options`, HSTS, `Referrer-Policy` y `Permissions-Policy`; cookies `httpOnly`, `secure` y `sameSite=strict`.
- **Errores**: los mensajes internos (base de datos, red) no se exponen al cliente.

---

## 🚀 Puesta en marcha

### Requisitos
- Node.js 18.18 o superior
- Un proyecto de [Supabase](https://supabase.com)
- Una cuenta de [Resend](https://resend.com) (para el envío de emails)

### 1. Instalar

```bash
git clone <url-del-repositorio>
cd tienda-multivendedor-demo
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role`. **Solo servidor, nunca exponer.** |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave `anon` (pública por diseño) |
| `RESEND_API_KEY` | API key de Resend para los emails |
| `JWT_SECRET` | Secreto para firmar sesiones (mínimo 32 caracteres) |
| `VENDOR_ID_SECRET` | Secreto para derivar los IDs públicos de vendedores (mínimo 32 caracteres) |
| `ADMIN_EMAILS` | Emails de administradores, separados por coma |
| `SUPABASE_SOCIOS_URL`, `SUPABASE_SOCIOS_PUBLISHABLE_KEY`, `SOCIOS_INTEGRACION_SECRET` | Integración opcional con un sistema externo de socios |
| `NEXT_PUBLIC_SITIO_INSTITUCIONAL_URL` | URL base del sitio institucional enlazado en la barra de navegación |

Generá los secretos con:

```bash
openssl rand -hex 32
```

> ⚠️ Usá un valor **distinto** para cada secreto y para cada entorno. Nunca subas `.env.local` al repositorio.

### 3. Base de datos

Creá en Supabase las tablas que usa la aplicación: `productos_oficiales`, `productos_socios`, `servicios_socios`, `socios`, `stock_variantes`, `promociones`, `pedidos`, `config`, `login_attempts` y `admin_claves`; y los buckets de Storage `productos-imagenes` (público) y `comprobantes` (privado).

Recomendaciones:
- Activar **Row Level Security** en todas las tablas. La aplicación accede con la clave `service_role` únicamente desde el servidor.
- Cargar en la tabla `config` los valores de la tienda (nombre, colores, alias/CBU, WhatsApp, email de notificaciones, etc.).

### 4. Crear el primer administrador

Generá el hash de la clave y cargalo en la tabla `admin_claves` (`email`, `clave_hash`). Además, el email debe figurar en `ADMIN_EMAILS`.

```bash
node scripts/hash-clave.mjs "una-clave-larga-y-segura"
```

### 5. Ejecutar

```bash
npm run dev
```

Abrí `http://localhost:3000`.

---

## ☁️ Despliegue en Vercel

1. Importá el repositorio en Vercel.
2. Cargá **todas** las variables de entorno de la tabla anterior.
3. Desplegá.

---

## ⚠️ Limitaciones conocidas

Para ser transparente sobre el estado del proyecto:

- **Condición de carrera en el stock**: el descuento de stock no es transaccional; dos compras simultáneas del último ítem podrían superar el stock. La solución prevista es una función RPC en PostgreSQL.
- **Rate limiting parcial**: hay bloqueo por intentos fallidos (logins y códigos promocionales, guardado en la tabla `login_attempts`), pero no un límite general de peticiones por IP en `/api/pedidos` ni en la subida de comprobantes. En producción se delega en las reglas de rate limit del firewall de Vercel.
- **Sin reserva con expiración**: los pedidos sin comprobante igualmente descuentan stock.
- **Sin suite de tests automatizados**; la verificación de las medidas de seguridad se hizo con pruebas manuales y scripts puntuales.

---

## 🔭 Posibles mejoras

- Descuento de stock transaccional (RPC de PostgreSQL) con reserva por tiempo limitado.
- Rate limiting global por IP sobre un almacén compartido (por ejemplo Upstash Redis).
- Política de Content-Security-Policy.
- Tests automatizados de la capa de negocio y de seguridad.
- Migración a TypeScript.

---

## 🎨 Sobre esta versión demo

La marca, los textos institucionales y el logo son genéricos. Los datos reales (tablas, usuarios, pedidos, claves) no forman parte del repositorio: para ejecutarlo hay que crear un proyecto propio de Supabase y completar `.env.local` como se indica arriba.

---

## 📄 Licencia

Proyecto de portafolio. Todos los derechos reservados salvo indicación contraria.
