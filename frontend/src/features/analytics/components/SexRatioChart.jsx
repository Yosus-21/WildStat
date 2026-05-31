import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import ChartCard from './ChartCard';

const COLORS = ['#1e6f50', '#0984e3', '#e17055'];

export default function SexRatioChart({ data, error }) {
  const total = data?.reduce((sum, item) => sum + Number(item.count || 0), 0) ?? 0;
  return (
    <ChartCard
      title="Proporción de sexos"
      description="Distribución de sexo registrada en validación."
      error={error}
      empty={!total && 'Todavía no hay datos de sexo validados.'}
    >
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" outerRadius={95} label>
            {data?.map((item, index) => (
              <Cell key={item.sex} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
