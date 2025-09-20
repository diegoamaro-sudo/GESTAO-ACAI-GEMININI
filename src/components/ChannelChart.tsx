import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ChannelData = {
  name: string;
  value: number;
};

type ChannelChartProps = {
  data: ChannelData[];
};

const COLORS = ['#9f54ff', '#00e6e6', '#ff3399', '#aaff00', '#ff9933', '#ff3333'];

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