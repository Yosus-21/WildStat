import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  {
    section: 'Carga',
    links: [
      { to: '/media/upload', label: 'Subir imagen/video', icon: '⬆️' },
    ],
  },
  {
    section: 'Revisión',
    links: [
      { to: '/detections/pending', label: 'Pendientes', icon: '⏳' },
      { to: '/detections/validated', label: 'Validadas', icon: '✅' },
      { to: '/detections/discarded', label: 'Descartadas', icon: '🗑️' },
    ],
  },
  {
    section: 'Dataset',
    links: [
      { to: '/dataset/validated', label: 'Dataset validado', icon: '📊' },
    ],
  },
  {
    section: 'Analytics',
    links: [
      { to: '/analytics', label: 'Dashboard Analytics', icon: '📈' },
      { to: '/reports', label: 'Reportes', icon: '📄' },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const pageLabel = (() => {
    if (location.pathname.includes('/media/upload')) return 'Subir imagen/video';
    if (location.pathname.includes('/pending')) return 'Detecciones pendientes';
    if (location.pathname.includes('/validated') && location.pathname.includes('/detections'))
      return 'Detecciones validadas';
    if (location.pathname.includes('/discarded')) return 'Detecciones descartadas';
    if (location.pathname.includes('/dataset')) return 'Dataset validado';
    if (location.pathname.includes('/analytics')) return 'Dashboard Analytics';
    if (location.pathname.includes('/reports')) return 'Reportes';
    if (location.pathname.includes('/review')) return 'Revisar detección';
    return 'WildStat';
  })();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h1><span>🐆</span> WildStat</h1>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ section, links }) => (
            <div key={section} className={styles.navSection}>
              <div className={styles.navLabel}>{section}</div>
              {links.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `${styles.navLink}${isActive ? ' ' + styles.active : ''}`
                  }
                >
                  <span className={styles.icon}>{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.userBox}>
          <div className={styles.userName}>{user?.name}</div>
          <div className={styles.userRole}>{user?.role}</div>
          <button className={styles.logoutBtn} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.pageTitle}>{pageLabel}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {user?.email}
          </span>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
