import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ChannelData = {
  name: string;
  value: number;
};

type ChannelChartProps = {
  data: ChannelData[];
};

const COLORS = ['#8B5CF6', '#22D3EE', '#F471B5', '#4ADE80', '#F97316', '#EF4444'];

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
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
              isAnimationActive={true}
              animationDuration={800}
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