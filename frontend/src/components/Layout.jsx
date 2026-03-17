import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, Package, Users, FileText, BookOpen, LogOut, Cctv, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/events', icon: Calendar, label: 'Eventos' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/personnel', icon: Users, label: 'Personal', adminOnly: true },
  { to: '/reports', icon: FileText, label: 'Reportes' },
  { to: '/tutorials', icon: BookOpen, label: 'Tutoriales' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="layout-root">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`layout-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cctv size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
                Congress
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                CCTV
              </div>
            </div>
          </div>
          <button className="btn-icon sidebar-close" onClick={closeSidebar}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={closeSidebar}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius)',
                marginBottom: 2, textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontWeight: 600,
                fontSize: '0.87rem', letterSpacing: '0.01em',
                transition: 'all 0.15s',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
              })}
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '14px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '10px 12px', marginBottom: 4, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.nombre} {user?.apellido}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <span className={`badge badge-${user?.role === 'admin' ? 'admin' : 'personal'}`}>
                {user?.role === 'admin' ? 'Administrador' : 'Personal'}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="layout-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cctv size={14} color="var(--accent)" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem' }}>Congress CCTV</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div className="layout-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
