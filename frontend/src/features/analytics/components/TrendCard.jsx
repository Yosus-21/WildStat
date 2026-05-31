import ChartCard from './ChartCard';
import styles from '../pages/AnalyticsDashboardPage.module.css';

const TREND_ICON = {
  INCREASING: '↑',
  DECREASING: '↓',
  STABLE: '→',
  INSUFFICIENT_DATA: 'i',
};

export default function TrendCard({ data, error }) {
  return (
    <ChartCard title="Tendencia" description="Lectura orientativa de eventos independientes." error={error}>
      <div className={styles.trend}>
        <span className={styles.trendIcon}>{TREND_ICON[data?.trend] || 'i'}</span>
        <div>
          <strong>{data?.trend || 'Sin tendencia'}</strong>
          <p>{data?.message || 'Sin mensaje disponible.'}</p>
        </div>
      </div>
      <div className={styles.periods}>
        {data?.periods?.map((period) => (
          <span key={period.period}>
            {period.period}: {period.independentJaguarEvents}
          </span>
        ))}
      </div>
      {data?.note && <p className={styles.note}>{data.note}</p>}
    </ChartCard>
  );
}
