import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import RevenueChart from "@/components/RevenueChart";
import TransactionsChart from "@/components/TransactionsChart";

const Index = () => {
  const [stats, setStats] = useState({
    profitMonth: 0,
    expensesMonth: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const { data: vendasMes, error: vendasError } = await supabase
      .from('vendas')
      .select('valor_total, lucro_total, created_at')
      .gte('created_at', startOfMonth.toISOString());

    const { data: despesasMes, error: despesasError } = await supabase
      .from('despesas')
      .select('valor')
      .gte('data', startOfMonth.toISOString().split('T')[0]);

    if (vendasError || despesasError) {
      console.error("Error fetching stats:", vendasError || despesasError);
      setLoading(false);
      return;
    }

    const profitMonth = vendasMes?.reduce((acc, v) => acc + (v.lucro_total || 0), 0) || 0;
    const expensesMonth = despesasMes?.reduce((acc, d) => acc + (d.valor || 0), 0) || 0;
    setStats({ profitMonth, expensesMonth });

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const dummyRevenueData = monthLabels.map(month => ({
      name: month,
      vendas: Math.floor(Math.random() * 5000) + 1000,
    }));
    setRevenueData(dummyRevenueData);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const transactionsData = [
    { name: 'Profit', value: stats.profitMonth },
    { name: 'Expenses', value: stats.expensesMonth },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <Card>
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold">Finance preview</h1>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
        </Card>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground font-normal">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-12 w-32 animate-pulse bg-muted rounded"></div> : 
              <p className="text-4xl font-bold">{formatCurrency(stats.profitMonth)}</p>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground font-normal">Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-12 w-32 animate-pulse bg-muted rounded"></div> : 
              <p className="text-4xl font-bold">{formatCurrency(stats.expensesMonth)}</p>
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {loading ? <Card><div className="h-[374px] w-full animate-pulse bg-card rounded-lg"></div></Card> :
            <RevenueChart data={revenueData} />
          }
        </div>
        <div>
          {loading ? <Card><div className="h-[374px] w-full animate-pulse bg-card rounded-lg"></div></Card> :
            <TransactionsChart data={transactionsData.filter(d => d.value > 0)} />
          }
        </div>
      </div>
    </div>
  );
};

export default Index;