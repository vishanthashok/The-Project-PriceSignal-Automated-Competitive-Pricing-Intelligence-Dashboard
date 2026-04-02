import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getUnreadAlerts } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { Alert } from '../types';

const NAV = [
  { to: '/overview',        label: 'Overview',         icon: '▦' },
  { to: '/trends',          label: 'Trends',           icon: '↗' },
  { to: '/recommendations', label: 'Recommendations',  icon: '◎' },
  { to: '/alerts',          label: 'Alerts',           icon: '◉' },
];

export default function Layout() {
  const { logout } = useAuth();
  const { data: unread } = useQuery<Alert[]>({
    queryKey: ['alerts', 'unread'],
    queryFn: () => getUnreadAlerts().then(r => r.data),
    refetchInterval: 30_000,
  });

  const unreadCount = unread?.length ?? 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--green)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 600, color: '#0d0f0e',
            }}>P</div>
            <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.3px' }}>PriceSignal</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
              fontSize: 14, fontWeight: 500,
              color: isActive ? 'var(--green)' : 'var(--text-muted)',
              background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontSize: 13, opacity: 0.8 }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {label === 'Alerts' && unreadCount > 0 && (
                <span style={{
                  background: 'var(--red)', color: '#fff',
                  borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600,
                }}>{unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Add product CTA */}
        <div style={{ padding: '0 12px', marginTop: 16 }}>
          <NavLink to="/add-product" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '9px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: 'var(--green)', border: '1px solid rgba(34,197,94,0.3)',
              textAlign: 'center', cursor: 'pointer',
              transition: 'background 0.15s',
            }}>+ Add product</div>
          </NavLink>
        </div>

        {/* Logout */}
        <div style={{ padding: '16px 12px 0' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
            color: 'var(--text-muted)', background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          }}>⎋ Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        <Outlet />
      </main>
    </div>
  );
}
