import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CreditCard, Package } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const [stats, setStats] = useState({
    salesToday: 0,
    profitToday: 0,
    salesMonth: 0,
    profitMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfMonthISO = startOfMonth.toISOString();

      // Fetch today's sales
      const { data: todayData, error: todayError } = await supabase
        .from('vendas')
        .select('valor_total, lucro_total')
        .gte('created_at', todayISO);

      // Fetch month's sales
      const { data: monthData, error: monthError } = await supabase
        .from('vendas')
        .select('valor_total, lucro_total')
        .gte('created_at', startOfMonthISO);

      if (todayError || monthError) {
        console.error("Error fetching stats:", todayError || monthError);
        setLoading(false);
        return;
      }

      const todayStats = todayData.reduce(
        (acc, sale) => {
          acc.sales += sale.valor_total || 0;
          acc.profit += sale.lucro_total || 0;
          return acc;
        },
        { sales: 0, profit: 0 }
      );

      const monthStats = monthData.reduce(
        (acc, sale) => {
          acc.sales += sale.valor_total || 0;
          acc.profit += sale.lucro_total || 0;
          return acc;
        },
        { sales: 0, profit: 0 }
      );

      setStats({
        salesToday: todayStats.sales,
        profitToday: todayStats.profit,
        salesMonth: monthStats.sales,
        profitMonth: monthStats.profit,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button>Nova Venda</Button>
          <Button variant="outline">Nova Despesa</Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.salesToday)}</div>}
            <p className="text-xs text-muted-foreground">Total de vendas no dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Hoje</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.profitToday)}</div>}
            <p className="text-xs text-muted-foreground">Lucro líquido no dia</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas no Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.salesMonth)}</div>}
            <p className="text-xs text-muted-foreground">Total de vendas no mês atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro no Mês</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-8 w-24 animate-pulse bg-muted rounded"></div> : <div className="text-2xl font-bold">{formatCurrency(stats.profitMonth)}</div>}
            <p className="text-xs text-muted-foreground">Lucro líquido no mês atual</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;