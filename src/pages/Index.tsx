import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CreditCard, MinusCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { NovaDespesaDialog } from "@/components/NovaDespesaDialog";

const Index = () => {
  const [stats, setStats] = useState({
    salesToday: 0,
    profitToday: 0,
    salesMonth: 0,
    profitMonth: 0,
    expensesToday: 0,
    expensesMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const { data: vendasData, error: vendasError } = await supabase
      .from('vendas')
      .select('valor_total, lucro_total, created_at')
      .gte('created_at', startOfMonth);

    const { data: despesasData, error: despesasError } = await supabase
      .from('despesas')
      .select('valor, data')
      .gte('data', startOfMonth.split('T')[0]);

    if (vendasError || despesasError) {
      console.error("Error fetching stats:", vendasError || despesasError);
      setLoading(false);
      return;
    }

    const todayStr = today.toISOString().split('T')[0];

    const salesToday = vendasData?.filter(v => v.created_at.startsWith(todayStr)).reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;
    const profitToday = vendasData?.filter(v => v.created_at.startsWith(todayStr)).reduce((acc, v) => acc + (v.lucro_total || 0), 0) || 0;
    const salesMonth = vendasData?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;
    const profitMonth = vendasData?.reduce((acc, v) => acc + (v.lucro_total || 0), 0) || 0;

    const expensesToday = despesasData?.filter(d => d.data === todayStr).reduce((acc, d) => acc + (d.valor || 0), 0) || 0;
    const expensesMonth = despesasData?.reduce((acc, d) => acc + (d.valor || 0), 0) || 0;

    setStats({ salesToday, profitToday, salesMonth, profitMonth, expensesToday, expensesMonth });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <>
      <NovaDespesaDialog 
        open={isDespesaDialogOpen} 
        onOpenChange={setIsDespesaDialogOpen}
        onDespesaAdicionada={fetchStats}
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Button>Nova Venda</Button>
            <Button variant="outline" onClick={() => setIsDespesaDialogOpen(true)}>Nova Despesa</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.salesToday)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Hoje</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.profitToday)}</div>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Hoje</CardTitle>
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.expensesToday)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.salesMonth)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro no Mês</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.profitMonth)}</div>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas no Mês</CardTitle>
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.expensesMonth)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Index;