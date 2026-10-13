'use client';

import { useState } from 'react';
import './SiteNav.css';

const LOGO_URL = '/logo.svg';
const SITIO_BASE = (process.env.NEXT_PUBLIC_SITIO_INSTITUCIONAL_URL || 'https://example.com').replace(/\/+$/, '');

const LINKS = [
  { label: 'INICIO', href: `${SITIO_BASE}/inicio` },
  { label: 'SOCIOS', href: `${SITIO_BASE}/socios` },
  { label: 'TIENDA', href: '/', activa: true },
  { label: 'VIAJES', href: `${SITIO_BASE}/viajes` },
  { label: 'CONTACTO', href: `${SITIO_BASE}/contacto` },
];

export default function SiteNav() {
  const [abierto, setAbierto] = useState(false);

  return (
    <nav className="sn-nav">
      <div className="sn-barra">
        <a href={`${SITIO_BASE}/inicio`} className="sn-marca">
          <img src={LOGO_URL} alt="Tienda Demo" className="sn-logo" />
          <span className="sn-marca-texto">Tienda Demo</span>
        </a>

        <ul className="sn-links-desktop">
          {LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href} className={'sn-link' + (link.activa ? ' sn-link-activo' : '')}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className="sn-hamburguesa"
          type="button"
          aria-label="Abrir menú"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>

      {abierto && (
        <>
          <div className="sn-menu-overlay" onClick={() => setAbierto(false)} />
          <div className="sn-menu-movil">
            <ul>
              {LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={'sn-link-movil' + (link.activa ? ' sn-link-activo' : '')}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
