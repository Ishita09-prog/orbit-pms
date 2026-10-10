import { useEffect, useId, useState } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, FolderKanban, LayoutDashboard, LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../lib/format.js';

export function Logo({ size = 34 }) {
  // Each instance needs its own gradient id: a gradient defined inside a display:none copy cannot be referenced.
  const gradient = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b7dff" />
          <stop offset="1" stopColor="#34e0b5" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="25" ry="10" fill="none" stroke={`url(#${gradient})`} strokeWidth="4" transform="rotate(-28 32 32)" />
      <circle cx="32" cy="32" r="9" fill={`url(#${gradient})`} />
      <circle cx="52" cy="20" r="4" fill="#ffc15a" />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
];

function NavItems({ pillId }) {
  return NAV.map(({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId={pillId} className="nav-pill" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  ));
}

function RefreshButton({ withLabel }) {
  const queryClient = useQueryClient();
  const fetching = useIsFetching() > 0;
  return (
    <button
      type="button"
      className={withLabel ? 'btn btn-ghost btn-sm btn-block' : 'icon-btn'}
      onClick={() => queryClient.invalidateQueries()}
      aria-label="Refresh data"
      title="Refresh — pick up changes made on your phone"
    >
      <RefreshCw size={16} className={fetching ? 'spin' : ''} aria-hidden="true" />
      {withLabel && 'Refresh'}
    </button>
  );
}

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          className="banner warn offline-bar"
          role="status"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
        >
          <WifiOff size={18} aria-hidden="true" /> You’re offline. Changes won’t save until you reconnect.
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const outlet = useOutlet();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  // Always start a new page at the top.
  useEffect(() => window.scrollTo({ top: 0 }), [location.pathname]);

  return (
    <div className="shell">
      <OfflineBanner />
      <aside className="sidebar">
        <div className="brand">
          <Logo /> Orbit
        </div>
        <nav className="nav" aria-label="Main">
          <NavItems pillId="nav-pill-desktop" />
        </nav>
        <div className="sidebar-foot">
          <RefreshButton withLabel />
          <div className="user-chip">
            <div className="avatar" aria-hidden="true">{initials(user?.fullName)}</div>
            <div className="user-meta">
              <strong>{user?.fullName}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" className="icon-btn danger" onClick={handleLogout} disabled={loggingOut} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar-mobile">
          <div className="brand" style={{ padding: 0 }}>
            <Logo size={30} /> Orbit
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <RefreshButton />
            <button type="button" className="icon-btn danger" onClick={handleLogout} disabled={loggingOut} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="page"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottom-nav" aria-label="Main">
        <NavItems pillId="nav-pill-mobile" />
      </nav>
    </div>
  );
}
