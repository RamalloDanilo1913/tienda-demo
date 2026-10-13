import './globals.css';

const LOGO_URL = '/logo.svg';

export const metadata = {
  title: 'Tienda Demo',
  description: 'Productos oficiales y de socios vendedores. Proyecto de portafolio.',
  icons: {
    icon: LOGO_URL,
    shortcut: LOGO_URL,
    apple: LOGO_URL,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;500;600;700&family=Roboto:ital,wght@0,400;0,900;1,900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
