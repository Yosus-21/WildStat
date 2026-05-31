import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from './ChartCard';
import styles from '../pages/AnalyticsDashboardPage.module.css';

export default function ZoneChart({ data, error }) {
  const hasUnset = data?.some((item) => item.zone === 'Sin zona');
  return (
    <ChartCard
      title="Eventos por zona"
      description="Distribución espacial según zona de cámara."
      error={error}
      empty={!data?.length && 'No hay eventos por zona todavía.'}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="zone" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="events" name="Eventos" fill="#1e6f50" />
          <Bar dataKey="independentEvents" name="Independientes" fill="#0984e3" />
        </BarChart>
      </ResponsiveContainer>
      {hasUnset && (
        <p className={styles.note}>Algunas cámaras aún no tienen zona asignada.</p>
      )}
    </ChartCard>
  );
}
