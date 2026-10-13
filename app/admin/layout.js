import './admin.css';

export const metadata = { title: 'Panel Admin · Tienda Demo' };

export default function AdminLayout({ children }) {
  return <div className="adm-root">{children}</div>;
}
