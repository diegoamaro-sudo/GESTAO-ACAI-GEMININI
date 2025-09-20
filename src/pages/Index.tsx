import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CreditCard, MinusCircle, TrendingUp } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { NovaDespesaDialog } from "@/components/NovaDespesaDialog";
import { NovaVendaDialog } from "@/components/NovaVendaDialog";
import SalesChart from "@/components/SalesChart";
import ChannelChart from "@/components/ChannelChart";

const Index = () => {
  const [stats, setStats] = useState({
    salesToday: 0,
    profitToday: 0,
    salesMonth: 0,
    profitMonth: 0,
    expensesToday: 0,
    expensesMonth: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false);
  const [isVendaDialogOpen, setIsVendaDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: vendasMes, error: vendasError } = await supabase
      .from('vendas')
      .select('valor_total, lucro_total, created_at, canais_venda(nome)')
      .gte('created_at', startOfMonth.toISOString());

    const { data: despesasMes, error: despesasError } = await supabase
      .from('despesas')
      .select('valor, data')
      .gte('data', startOfMonth.toISOString().split('T')[0]);

    if (vendasError || despesasError) {
      console.error("Error fetching stats:", vendasError || despesasError);
      setLoading(false);
      return;
    }

    const todayStr = today.toISOString().split('T')[0];
    const salesToday = vendasMes?.filter(v => v.created_at.startsWith(todayStr)).reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;
    const profitToday = vendasMes?.filter(v => v.created_at.startsWith(todayStr)).reduce((acc, v) => acc + (v.lucro_total || 0), 0) || 0;
    const salesMonth = vendasMes?.reduce((acc, v) => acc + (v.valor_total || 0), 0) || 0;
    const profitMonth = vendasMes?.reduce((acc, v) => acc + (v.lucro_total || 0), 0) || 0;
    const expensesToday = despesasMes?.filter(d => d.data === todayStr).reduce((acc, d) => acc + (d.valor || 0), 0) || 0;
    const expensesMonth = despesasMes?.reduce((acc, d) => acc + (d.valor || 0), 0) || 0;
    setStats({ salesToday, profitToday, salesMonth, profitMonth, expensesToday, expensesMonth });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return d;
    }).reverse();

    const dailyData = last7Days.map(d => ({
      name: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      date: d.toISOString().split('T')[0],
      vendas: 0,
      lucro: 0,
    }));

    vendasMes?.filter(v => new Date(v.created_at) >= sevenDaysAgo).forEach(venda => {
      const vendaDate = venda.created_at.split('T')[0];
      const dayData = dailyData.find(d => d.date === vendaDate);
      if (dayData) {
        dayData.vendas += venda.valor_total || 0;
        dayData.lucro += venda.lucro_total || 0;
      }
    });
    setChartData(dailyData);

    const salesByChannel = vendasMes?.reduce((acc, venda) => {
      const channelName = venda.canais_venda?.nome || 'N/A';
      acc[channelName] = (acc[channelName] || 0) + (venda.valor_total || 0);
      return acc;
    }, {} as Record<string, number>);

    const channelChartData = Object.entries(salesByChannel || {}).map(([name, value]) => ({ name, value }));
    setChannelData(channelChartData);

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
      <NovaVendaDialog
        open={isVendaDialogOpen}
        onOpenChange={setIsVendaDialogOpen}
        onVendaAdicionada={fetchStats}
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsVendaDialogOpen(true)}>Nova Venda</Button>
            <Button variant="outline" onClick={() => setIsDespesaDialogOpen(true)}>Nova Despesa</Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-primary">{formatCurrency(stats.salesToday)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-success">{formatCurrency(stats.profitToday)}</div>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Hoje</CardTitle>
              <MinusCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.expensesToday)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-primary">{formatCurrency(stats.salesMonth)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro no Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-success">{formatCurrency(stats.profitMonth)}</div>}
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas no Mês</CardTitle>
              <MinusCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.expensesMonth)}</div>}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <Card className="col-span-1 lg:col-span-2"><CardContent className="pt-6"><div className="h-[350px] w-full animate-pulse bg-muted rounded"></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="h-[350px] w-full animate-pulse bg-muted rounded"></div></CardContent></Card>
            </>
          ) : (
            <>
              <SalesChart data={chartData} />
              <ChannelChart data={channelData} />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Index;