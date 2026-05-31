import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  {
    section: 'General',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: '◆' },
      { to: '/projects', label: 'Proyectos', icon: '◇' },
      { to: '/cameras', label: 'Cámaras', icon: '⌖' },
    ],
  },
  {
    section: 'Operación',
    links: [
      { to: '/media/upload', label: 'Archivos', icon: '▣' },
      { to: '/detections/pending', label: 'Detecciones', icon: '◎' },
      { to: '/detections/pending', label: 'Validación', icon: '✓' },
    ],
  },
  {
    section: 'Listas',
    links: [
      { to: '/detections/validated', label: 'Validadas', icon: '●' },
      { to: '/detections/discarded', label: 'Descartadas', icon: '×' },
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
      { to: '/analytics', label: 'Analytics', icon: '▧' },
      { to: '/reports', label: 'Reportes', icon: '◫' },
      { to: '/reports', label: 'Configuración', icon: '⚙' },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const pageLabel = (() => {
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/projects')) return 'Proyectos';
    if (location.pathname.includes('/cameras')) return 'Cámaras';
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
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar} aria-label="Navegación principal">
        <div className={styles.logo}>
          <div className={styles.logoMark}>W</div>
          <div className={styles.logoText}>
            <h1>WildStat</h1>
            <span>Fauna Intelligence</span>
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? '›' : '‹'}
          </button>
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
          <div className={styles.avatar} aria-hidden="true">{user?.name?.slice(0, 1) || 'U'}</div>
          <div className={styles.userMeta}>
          <div className={styles.userName}>{user?.name}</div>
          <div className={styles.userRole}>{user?.role}</div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.projectLabel}>Monitoreo Jaguar Palmarito 2026</span>
            <span className={styles.pageTitle}>{pageLabel}</span>
          </div>
          <label className={styles.search}>
            <span>⌕</span>
            <input type="search" placeholder="Buscar proyecto, cámara o detección" />
          </label>
          <div className={styles.topUser}>
            <span>{user?.email}</span>
            <div className={styles.topAvatar}>{user?.name?.slice(0, 1) || 'U'}</div>
          </div>
        </header>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
