import styles from '../pages/AnalyticsDashboardPage.module.css';

const ITEMS = [
  ['totalMediaFiles', 'Archivos procesados', 'Imágenes y videos en el sistema'],
  ['totalDetections', 'Detecciones totales', 'Eventos generados y revisados'],
  ['pendingDetections', 'Pendientes', 'Esperan validación humana'],
  ['validatedDetections', 'Validadas', 'Confirmadas por investigador'],
  ['discardedDetections', 'Descartadas', 'Falsos positivos o sin animal'],
  ['jaguarEvents', 'Eventos jaguar', 'Detecciones validadas como jaguar'],
  ['jaguarIndependentEvents', 'Independientes', 'Eventos/individuos marcados independientes'],
  ['speciesCount', 'Especies', 'Especies validadas detectadas'],
  ['camerasCount', 'Cámaras', 'Cámaras con registros'],
  ['projectsCount', 'Proyectos', 'Proyectos registrados'],
];

export default function SummaryCards({ data }) {
  return (
    <div className={styles.summaryGrid}>
      {ITEMS.map(([key, label, help]) => (
        <div key={key} className={styles.summaryCard}>
          <div className={styles.summaryValue}>{data?.[key] ?? 0}</div>
          <div className={styles.summaryLabel}>{label}</div>
          <div className={styles.summaryHelp}>{help}</div>
        </div>
      ))}
    </div>
  );
}
