import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type SalesData = {
  name: string;
  vendas: number;
  lucro: number;
};

type SalesChartProps = {
  data: SalesData[];
};

const SalesChart = ({ data }: SalesChartProps) => {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Visão Geral dos Últimos 7 Dias</CardTitle>
        <CardDescription>Comparativo de vendas e lucro.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value}`}
            />
            <Tooltip
              formatter={(value: number) =>
                value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              }
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar dataKey="vendas" fill="hsl(var(--primary))" name="Vendas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro" fill="hsl(var(--primary) / 0.5)" name="Lucro" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SalesChart;