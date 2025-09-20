import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ChannelData = {
  name: string;
  value: number;
};

type ChannelChartProps = {
  data: ChannelData[];
};

const COLORS = ['#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#ef4444'];

const ChannelChart = ({ data }: ChannelChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas por Canal no Mês</CardTitle>
        <CardDescription>Distribuição do faturamento por canal de venda.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Tooltip
              formatter={(value: number) =>
                value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              }
              contentStyle={{
                backgroundColor: 'hsl(var(--background) / 0.8)',
                borderColor: 'hsl(var(--border))',
                backdropFilter: 'blur(4px)',
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ChannelChart;