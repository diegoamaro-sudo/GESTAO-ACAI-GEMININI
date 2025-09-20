import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type PerformanceData = {
  name: string;
  vendas: number;
  lucro: number;
};

type PerformanceChartProps = {
  data: PerformanceData[];
};

const PerformanceChart = ({ data }: PerformanceChartProps) => {
  return (
    <div className="p-0.5 rounded-lg bg-gradient-to-r from-pink-500 via-primary to-green-400">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Desempenho dos Últimos 7 Dias</CardTitle>
          <CardDescription>Evolução de vendas e lucros.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--primary-foreground))' }}
                formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              />
              <Area type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorVendas)" />
              <Area type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#colorLucro)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceChart;