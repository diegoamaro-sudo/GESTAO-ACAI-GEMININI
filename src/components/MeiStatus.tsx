import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type MeiStatusProps = {
  faturamentoAnual: number;
  limiteMei: number;
};

const MeiStatus = ({ faturamentoAnual, limiteMei }: MeiStatusProps) => {
  const percentual = (faturamentoAnual / limiteMei) * 100;
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let statusText = 'Regular';
  let statusColor = 'text-green-400';
  let progressColor = 'bg-green-400';

  if (faturamentoAnual >= 70000) {
    statusText = 'Alerta';
    statusColor = 'text-red-500';
    progressColor = 'bg-red-500';
  } else if (faturamentoAnual >= 60000) {
    statusText = 'Atenção';
    statusColor = 'text-orange-400';
    progressColor = 'bg-orange-400';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Faturamento MEI</CardTitle>
        <CardDescription>Acompanhe seu faturamento anual em relação ao teto do MEI.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold text-primary">{formatCurrency(faturamentoAnual)}</span>
            <span className="text-muted-foreground">/ {formatCurrency(limiteMei)}</span>
          </div>
          <Progress value={percentual} className="h-3 [&>*]:bg-primary" indicatorClassName={progressColor} />
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Status: <span className={cn("font-bold", statusColor)}>{statusText}</span></span>
            <span className="text-muted-foreground">{percentual.toFixed(2)}% atingido</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeiStatus;