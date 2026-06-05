'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

interface SidebarProps { userName: string; userRole: string; resetRequestCount?: number; }

export default function Sidebar({ userName, userRole, resetRequestCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('crm_theme');
      if (saved === 'dark') {
        setDark(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('crm_theme', next ? 'dark' : 'light');
    }
  };







  // Close More drawer whenever route changes
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const active = (href: string) => pathname === href;

  // ── Bottom nav: 4 most-used items that always fit ──
  const bottomNav = [
    { href: '/dashboard', icon: 'fas fa-th-large', label: 'Home' },
    { href: '/leads',     icon: 'fas fa-user-tie',  label: 'Leads' },
    { href: '/properties',icon: 'fas fa-building',  label: 'Properties' },
    { href: '/kanban',    icon: 'fas fa-columns',   label: 'Kanban' },
    { href: '/followups', icon: 'fas fa-bell',      label: 'Follow-ups' },
  ];

  // ── Secondary items go into "More" drawer ──
  const moreNav = [
    { href: '/calendar',  icon: 'fas fa-calendar-alt', label: 'Calendar' },
    { href: '/deals',     icon: 'fas fa-handshake',    label: 'Deals' },
    { href: '/invoices',  icon: 'fas fa-file-invoice-dollar', label: 'Invoices' },
    { href: '/analytics', icon: 'fas fa-chart-bar',    label: 'Analytics' },
    { href: '/reports',   icon: 'fas fa-file-alt',     label: 'Reports' },
    ...(userRole === 'admin'
      ? [{ href: '/users', icon: 'fas fa-users-cog', label: 'Users' }]
      : []),
  ];

  return (
    <>
      {/* ══════════════════════════════════════
          DESKTOP SIDEBAR  (hidden on mobile via CSS)
      ══════════════════════════════════════ */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🏠</div>
          <div>
            <div className="logo-text">Fill My Calendar</div>
            <div className="logo-sub">Real Estate Platform</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">{userName[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{userName}</div>
            <div className="user-role">
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', marginRight: 4 }} />
              {userRole}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Main</div>
          <Link href="/dashboard"  className={active('/dashboard')  ? 'nav-item active' : 'nav-item'}><i className="fas fa-th-large" /> Dashboard</Link>
          <Link href="/properties" className={active('/properties') ? 'nav-item active' : 'nav-item'}><i className="fas fa-building" /> Properties</Link>
          <Link href="/leads"      className={active('/leads')      ? 'nav-item active' : 'nav-item'}><i className="fas fa-user-tie" /> Leads</Link>
          <div className="nav-section-title">Workflow</div>
          <Link href="/kanban"     className={active('/kanban')     ? 'nav-item active' : 'nav-item'}><i className="fas fa-columns" /> Kanban Board</Link>
          <Link href="/calendar"   className={active('/calendar')   ? 'nav-item active' : 'nav-item'}><i className="fas fa-calendar-alt" /> Calendar</Link>
          <Link href="/followups"  className={active('/followups')  ? 'nav-item active' : 'nav-item'}><i className="fas fa-bell" /> Follow-ups</Link>
          <Link href="/deals"      className={active('/deals')      ? 'nav-item active' : 'nav-item'}><i className="fas fa-handshake" /> Deals</Link>
          <Link href="/invoices"   className={active('/invoices')   ? 'nav-item active' : 'nav-item'}><i className="fas fa-file-invoice-dollar" /> Invoices</Link>
          <div className="nav-section-title">Insights</div>
          <Link href="/analytics"  className={active('/analytics')  ? 'nav-item active' : 'nav-item'}><i className="fas fa-chart-bar" /> Analytics</Link>
          <Link href="/reports"    className={active('/reports')    ? 'nav-item active' : 'nav-item'}><i className="fas fa-file-alt" /> Reports</Link>
          {userRole === 'admin' && (
            <>
              <div className="nav-section-title">Admin</div>
              <Link href="/users" className={active('/users') ? 'nav-item active' : 'nav-item'} style={{ position: 'relative' }}>
                <i className="fas fa-users-cog" /> User Management
                {resetRequestCount > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 10, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 20, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    {resetRequestCount}
                  </span>
                )}
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sidebar-text)', fontSize: 13, padding: '10px 12px', borderRadius: 10, transition: 'all 0.15s', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', width: '100%', marginBottom: 8 }}>
            <i className={dark ? 'fas fa-sun' : 'fas fa-moon'} style={{ fontSize: 14, color: dark ? '#FBBF24' : '#94A3B8' }} />
            {dark ? 'Light Mode' : 'Dark Mode'}
            <span style={{ marginLeft: 'auto', background: dark ? '#1A56DB' : 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, color: 'white' }}>
              {dark ? 'ON' : 'OFF'}
            </span>
          </button>
          <button className="logout-btn" onClick={() => signOut({ callbackUrl: '/login' })}>
            <i className="fas fa-sign-out-alt" /> Sign Out
          </button>
        </div>
        <div className="sidebar-credit">
          Created by <strong style={{ color: '#CBD5E1' }}>Umair Arshad</strong><br />
          with <span style={{ color: '#EF4444' }}>❤️</span> for Real Estate
        </div>
      </aside>

      {/* ══════════════════════════════════════
          MOBILE BOTTOM NAV  (hidden on desktop via CSS)
          4 primary tabs + "More" — always fits any phone width
      ══════════════════════════════════════ */}
      <nav className="mobile-bottom-nav">
        {bottomNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item${active(item.href) ? ' active' : ''}`}
          >
            <i className={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* "More" button opens secondary-items drawer */}
        <button
          className={`mobile-nav-item${moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
          aria-label="More options"
        >
          <i className={moreOpen ? 'fas fa-times' : 'fas fa-ellipsis-h'} />
          <span>More</span>
        </button>
      </nav>

      {/* ── More Drawer (rendered only when open) ── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="mob-drawer-overlay"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div className="mob-more-drawer">
            <div className="mob-drawer-handle" />

            <div className="mob-drawer-grid">
              {moreNav.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mob-drawer-item${active(item.href) ? ' active' : ''}`}
                >
                  <i className={item.icon} />
                  {item.label}
                </Link>
              ))}

              <button
                className="mob-drawer-item mob-drawer-signout"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <i className="fas fa-sign-out-alt" />
                Sign Out
              </button>
            </div>

            <div className="mob-drawer-user">{userName} · {userRole}</div>
          </div>
        </>
      )}
    </>
  );
}
