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

export default function SpeciesFrequencyChart({ data, error }) {
  return (
    <ChartCard
      title="Frecuencia por especie"
      description="Eventos validados y eventos independientes por especie."
      error={error}
      empty={!data?.length && 'No hay especies validadas todavía.'}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="commonName" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="Eventos" fill="#1e6f50" />
          <Bar dataKey="independentCount" name="Independientes" fill="#0984e3" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
