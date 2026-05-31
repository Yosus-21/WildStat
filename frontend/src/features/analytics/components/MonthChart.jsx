import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartCard from './ChartCard';

export default function MonthChart({ data, error }) {
  return (
    <ChartCard
      title="Eventos por mes"
      description="Serie mensual de eventos validados."
      error={error}
      empty={!data?.length && 'No hay datos mensuales todavía.'}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthName" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="events" name="Eventos" stroke="#1e6f50" strokeWidth={2} />
          <Line type="monotone" dataKey="independentEvents" name="Independientes" stroke="#0984e3" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
