import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from './ChartCard';

export default function ActivityByHourChart({ data, error }) {
  return (
    <ChartCard
      title="Actividad por hora"
      description="Actividad registrada según hora estimada del evento validado."
      error={error}
      empty={!data?.length && 'No hay actividad horaria registrada.'}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="events" name="Eventos" fill="#1e6f50" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
