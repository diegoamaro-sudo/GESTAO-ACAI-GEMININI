import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ExpenseData = {
  name: string;
  value: number;
};

type TopExpensesChartProps = {
  data: ExpenseData[];
};

const COLORS = ['#a855f7', '#ec4899', '#22c55e', '#f97316', '#3b82f6', '#ef4444', '#eab308', '#6366f1', '#06b6d4', '#f43f5e'];

const TopExpensesChart = ({ data }: TopExpensesChartProps) => {
  const totalExpenses = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="p-0.5 rounded-lg bg-gradient-to-r from-pink-500 via-primary to-green-400">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Onde você gasta mais (Mês)</CardTitle>
          <CardDescription>Distribuição das despesas pagas no mês atual.</CardDescription>
        </CardHeader>
        <CardContent>
          {totalExpenses > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: '#FFFFFF' }} // Adicionado para o label
                  itemStyle={{ color: '#FFFFFF' }} // Adicionado para os itens
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
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Nenhuma despesa registrada para este mês.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TopExpensesChart;