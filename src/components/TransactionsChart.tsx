import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TransactionsData = {
  name: string;
  value: number;
};

type TransactionsChartProps = {
  data: TransactionsData[];
};

const COLORS = ['#A14FFD', '#4F378B'];

const TransactionsChart = ({ data }: TransactionsChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))'
              }}
              formatter={(value: number) =>
                value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              nameKey="name"
              isAnimationActive={true}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-6 flex flex-col gap-3 text-sm">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsChart;