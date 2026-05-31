import ChartCard from './ChartCard';
import styles from '../pages/AnalyticsDashboardPage.module.css';

export default function SharedHabitatCard({ data, error }) {
  const rows = data?.data || [];
  return (
    <ChartCard
      title="Hábitat compartido"
      description="Especies registradas en cámaras compartidas con jaguar."
      error={error}
      empty={!rows.length && (data?.note || 'No hay especies compartiendo cámaras con jaguar.')}
    >
      <div className={styles.sharedList}>
        {rows.map((item) => (
          <div key={item.speciesId || item.commonName} className={styles.sharedItem}>
            <strong>{item.commonName}</strong>
            <span>{item.records ?? item.count ?? 0} registros</span>
            <span>{item.sharesCameraWithJaguar ?? item.camerasCount ?? 0} cámaras compartidas</span>
          </div>
        ))}
      </div>
      {data?.note && <p className={styles.note}>{data.note}</p>}
    </ChartCard>
  );
}
