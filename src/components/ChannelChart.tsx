import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ChannelData = {
  name: string;
  value: number;
};

type ChannelChartProps = {
  data: ChannelData[];
};

const COLORS = ['#a855f7', '#ec4899', '#22c55e', '#f97316', '#3b82f6'];

const ChannelChart = ({ data }: ChannelChartProps) => {
  return (
    <div className="p-0.5 rounded-lg bg-gradient-to-r from-pink-500 via-primary to-green-400">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Vendas por Canal</CardTitle>
          <CardDescription>Distribuição do faturamento mensal.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChannelChart;