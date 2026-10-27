import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';
import { useRealtimeTables } from '../lib/useRealtimeTables.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/lookup', label: 'Patient Lookup', hint: '⌘K' },
  { to: '/patients', label: 'Patients' },
  { to: '/appointments', label: 'Appointments', badgeKey: 'today' },
  { to: '/payments', label: 'Payments' },
];

function formatClock(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pendingInquiries, setPendingInquiries] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Global ⌘K / Ctrl+K shortcut to jump straight to patient lookup.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/lookup');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  function loadPendingInquiries() {
    apiFetch('/admin/inquiries?status=PENDING')
      .then((data) => setPendingInquiries(Array.isArray(data) ? data.length : data.items?.length ?? null))
      .catch(() => {});
  }

  useEffect(loadPendingInquiries, []);
  useRealtimeTables(['contact_inquiries'], loadPendingInquiries);

  const initial = (user?.fullName || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="admin-app">
      <div
        className={`admin-drawer-backdrop${menuOpen ? ' is-open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <nav
        id="admin-drawer"
        className={`admin-sidebar${menuOpen ? ' is-open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="admin-sidebar__brand">
          <img src="/Dental_logo_transparent.png" alt="" className="admin-sidebar__brand-icon" />
          <div>
            <span className="admin-sidebar__brand-name">Dr. Kusum's Dental</span>
            <span className="admin-sidebar__brand-sub">Malleshpalya, Bangalore</span>
          </div>
        </div>

        <span className="admin-sidebar__eyebrow">Clinic Ops</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `admin-sidebar__link${isActive ? ' is-active' : ''}`}
          >
            <span>{item.label}</span>
            {item.badgeKey === 'inquiries' && pendingInquiries > 0 && (
              <span className="admin-sidebar__badge admin-sidebar__badge--alert">{pendingInquiries} New</span>
            )}
            {item.badgeKey === 'today' && <span className="admin-sidebar__badge">Today</span>}
            {item.hint && <span className="admin-sidebar__hint">{item.hint}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="admin-app__body">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="admin-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <span className="admin-topbar__title">Admin</span>

          <span className="admin-topbar__clock" aria-hidden="true">{formatClock(now)} IST</span>

          <div className="admin-topbar__user">
            <span className="admin-topbar__avatar">{initial}</span>
            <span className="admin-topbar__identity">
              <span className="admin-topbar__name">{user?.fullName}</span>
              <span className="admin-topbar__role">{user?.role?.toLowerCase()}</span>
            </span>
            <button className="secondary" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <main className="container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
