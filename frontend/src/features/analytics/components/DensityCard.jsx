import ChartCard from './ChartCard';
import styles from '../pages/AnalyticsDashboardPage.module.css';

export default function DensityCard({ data, error, selectedProjectId }) {
  return (
    <ChartCard
      title="Densidad simple"
      description="Estimación simplificada por área de muestreo."
      error={error}
      empty={!selectedProjectId && 'Selecciona un proyecto para calcular densidad.'}
    >
      <div className={styles.metricBlock}>
        <span className={styles.metricLabel}>{data?.projectName || 'Proyecto'}</span>
        <strong>{data?.densityPer100Km2 ?? '—'}</strong>
        <span>eventos independientes / 100 km²</span>
      </div>
      <dl className={styles.dataList}>
        <div><dt>Área</dt><dd>{data?.samplingAreaKm2 ?? '—'} km²</dd></div>
        <div><dt>Eventos independientes</dt><dd>{data?.independentJaguarEvents ?? '—'}</dd></div>
        <div><dt>Fórmula</dt><dd>{data?.formula || '—'}</dd></div>
      </dl>
      {data?.note && <p className={styles.note}>{data.note}</p>}
    </ChartCard>
  );
}
