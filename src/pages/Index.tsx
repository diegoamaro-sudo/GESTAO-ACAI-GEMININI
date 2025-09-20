import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, ShoppingBag, Wallet, ReceiptText, FileDown, Percent } from "lucide-react";
import PerformanceChart from "@/components/PerformanceChart";
import ChannelChart from "@/components/ChannelChart";
import TopExpensesChart from "@/components/TopExpensesChart"; // Novo componente
import TopProductsList from "@/components/TopProductsList"; // Novo componente
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { jsPDF } from 'jspdf'; // Alterado para importação nomeada
import 'jspdf-autotable';
import { showError, showSuccess } from '@/utils/toast'; // Importar showSuccess e showError

const MetricCard = ({ title, value, subtext, icon: Icon, gradient }: { title: string, value: string, subtext: string, icon: React.ElementType, gradient: string }) => (
  <div className={`p-0.5 rounded-lg ${gradient}`}>
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  </div>
);

const fetchDashboardData = async () => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Fetch Vendas
  const { data: vendas, error: vendasError, count: salesMonthCount } = await supabase
    .from('vendas')
    .select('valor_total, lucro_total, created_at, canais_venda(nome), itens_venda(quantidade, produtos(nome))', { count: 'exact' })
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  if (vendasError) throw new Error(vendasError.message);

  // Fetch Despesas OPERACIONAIS (sem venda_id) para cálculo de lucro e métrica
  const { data: operationalExpenses, error: operationalExpensesError } = await supabase
    .from('despesas')
    .select('valor, tipos_despesa(nome, emoji)')
    .eq('status', 'paga')
    .is('venda_id', null) // Filtra apenas despesas não vinculadas a vendas
    .gte('data', startOfMonth)
    .lte('data', endOfMonth);

  if (operationalExpensesError) throw new Error(operationalExpensesError.message);

  const totalDespesasOperacionaisMes = operationalExpenses?.reduce((acc, d) => acc + d.valor, 0) || 0;

  // Fetch TODAS as despesas pagas do mês (para o gráfico 'Onde você gasta mais')
  const { data: allPaidExpensesMonth, error: allPaidExpensesError } = await supabase
    .from('despesas')
    .select('valor, tipos_despesa(nome, emoji)')
    .eq('status', 'paga')
    .gte('data', startOfMonth)
    .lte('data', endOfMonth);

  if (allPaidExpensesError) throw new Error(allPaidExpensesError.message);

  const vendasHoje = vendas?.filter(v => v.created_at >= startOfDay) || [];
  const salesDay = vendasHoje.reduce((acc, v) => acc + v.valor_total, 0);
  const profitDayVendas = vendasHoje.reduce((acc, v) => acc + v.lucro_total, 0) || 0; // Lucro bruto das vendas do dia

  const salesMonth = vendas?.reduce((acc, v) => acc + v.valor_total, 0) || 0;
  const profitMonthVendas = vendas?.reduce((acc, v) => acc + v.lucro_total, 0) || 0; // Lucro bruto das vendas do mês

  // Lucro líquido do dia (lucro das vendas - despesas operacionais proporcionais ao dia, simplificado aqui)
  const profitDay = profitDayVendas; 

  // Lucro líquido do mês (lucro das vendas - despesas operacionais do mês)
  const profitMonth = profitMonthVendas - totalDespesasOperacionaisMes;

  const overallProfitMargin = salesMonth > 0 ? (profitMonth / salesMonth) * 100 : 0;

  const stats = {
    salesDay,
    profitDay,
    salesDayCount: vendasHoje.length,
    salesMonth,
    profitMonth,
    salesMonthCount: salesMonthCount || 0,
    totalDespesasMes: totalDespesasOperacionaisMes, // Reflete apenas despesas operacionais
    overallProfitMargin,
  };

  // Performance Chart Data (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - i);
    return { name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), vendas: 0, lucro: 0 };
  }).reverse();

  vendas?.filter(v => new Date(v.created_at) >= sevenDaysAgo).forEach(venda => {
    const dateStr = new Date(venda.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dayData = dailyData.find(d => d.name === dateStr);
    if (dayData) {
      dayData.vendas += venda.valor_total || 0;
      dayData.lucro += venda.lucro_total || 0; // Lucro bruto da venda
    }
  });

  // Sales by Channel Chart Data
  const salesByChannel = vendas?.reduce((acc, venda) => {
    const channelName = venda.canais_venda?.nome || 'N/A';
    acc[channelName] = (acc[channelName] || 0) + venda.valor_total;
    return acc;
  }, {} as Record<string, number>);
  const channelData = Object.entries(salesByChannel || {}).map(([name, value]) => ({ name, value }));

  // Top Expenses Chart Data (agora inclui todas as despesas pagas)
  const expensesByType = allPaidExpensesMonth?.reduce((acc, despesa) => {
    const typeName = despesa.tipos_despesa?.nome || 'Outros';
    acc[typeName] = (acc[typeName] || 0) + despesa.valor;
    return acc;
  }, {} as Record<string, number>);
  const topExpensesData = Object.entries(expensesByType || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top Products List Data
  const productSales: Record<string, { name: string; quantity: number }> = {};
  vendas?.forEach(venda => {
    venda.itens_venda.forEach(item => {
      const productName = item.produtos?.nome || 'Produto Desconhecido';
      if (productSales[productName]) {
        productSales[productName].quantity += item.quantidade;
      } else {
        productSales[productName] = { name: productName, quantity: item.quantidade };
      }
    });
  });
  const topProductsData = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5); // Top 5 products

  return { stats, chartData: dailyData, channelData, topExpensesData, topProductsData };
};

const Index = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
  });

  const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const stats = data?.stats || {
    salesDay: 0,
    profitDay: 0,
    salesDayCount: 0,
    salesMonth: 0,
    profitMonth: 0,
    salesMonthCount: 0,
    totalDespesasMes: 0,
    overallProfitMargin: 0,
  };

  const profitDayMargin = stats.salesDay > 0 ? ((stats.profitDay / stats.salesDay) * 100).toFixed(1) : '0.0';
  const profitMonthMargin = stats.salesMonth > 0 ? ((stats.profitMonth / stats.salesMonth) * 100).toFixed(1) : '0.0';

  const handleExportPdf = () => {
    if (!data) {
      showError('Dados do dashboard ainda não carregados. Por favor, aguarde e tente novamente.');
      return;
    }

    const doc = new jsPDF();
    const acaiPurple = [76, 29, 149]; // Cor roxa do açaí
    const lightPurple = [240, 235, 245]; // Um lilás bem claro

    // Cabeçalho
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(acaiPurple[0], acaiPurple[1], acaiPurple[2]);
    doc.text('Relatórios Chaves', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Dashboard Mensal - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 105, 28, { align: 'center' });

    let yOffset = 40;

    // Métricas Principais
    doc.setFontSize(12);
    doc.setTextColor(acaiPurple[0], acaiPurple[1], acaiPurple[2]);
    doc.text('Métricas Principais', 14, yOffset);
    yOffset += 7;
    doc.setTextColor(0); // Black for content
    doc.setFontSize(10);
    doc.text(`Vendas do Dia: ${formatCurrency(data.stats.salesDay)} (${data.stats.salesDayCount} vendas)`, 14, yOffset);
    doc.text(`Lucro do Dia: ${formatCurrency(data.stats.profitDay)} (${profitDayMargin}% de margem)`, 100, yOffset);
    yOffset += 6;
    doc.text(`Vendas do Mês: ${formatCurrency(data.stats.salesMonth)} (${data.stats.salesMonthCount} vendas)`, 14, yOffset);
    doc.text(`Lucro do Mês: ${formatCurrency(data.stats.profitMonth)} (${profitMonthMargin}% de margem)`, 100, yOffset);
    yOffset += 6;
    doc.text(`Despesas Pagas (Mês): ${formatCurrency(data.stats.totalDespesasMes)}`, 14, yOffset);
    doc.text(`Margem de Lucro Geral (Mês): ${formatPercentage(data.stats.overallProfitMargin)}`, 100, yOffset);
    yOffset += 15;

    // Despesas por Tipo
    doc.setFontSize(12);
    doc.setTextColor(acaiPurple[0], acaiPurple[1], acaiPurple[2]);
    doc.text('Despesas por Tipo (Mês)', 14, yOffset);
    yOffset += 5;
    (doc as any).autoTable({
      startY: yOffset,
      head: [['Tipo de Despesa', 'Valor']],
      body: data.topExpensesData.map(exp => [exp.name, formatCurrency(exp.value)]),
      theme: 'grid',
      headStyles: { fillColor: acaiPurple, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: lightPurple },
      margin: { left: 14, right: 14 },
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: function (data: any) {
        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
          doc.internal.pageSize.width - data.settings.margin.right,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      },
    });
    yOffset = (doc as any).autoTable.previous.finalY + 10;

    // Produtos Mais Vendidos
    doc.setFontSize(12);
    doc.setTextColor(acaiPurple[0], acaiPurple[1], acaiPurple[2]);
    doc.text('Produtos Mais Vendidos (Mês)', 14, yOffset);
    yOffset += 5;
    (doc as any).autoTable({
      startY: yOffset,
      head: [['Produto', 'Quantidade Vendida']],
      body: data.topProductsData.map(prod => [prod.name, prod.quantity.toString()]),
      theme: 'grid',
      headStyles: { fillColor: acaiPurple, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: lightPurple },
      margin: { left: 14, right: 14 },
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: function (data: any) {
        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`,
          doc.internal.pageSize.width - data.settings.margin.right,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        );
      },
    });

    doc.save('relatorio-chaves-dashboard.pdf');
    showSuccess('Relatório PDF gerado com sucesso!');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={handleExportPdf} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold transition-transform hover:scale-105">
          <FileDown className="mr-2 h-4 w-4" /> Exportar Relatório PDF
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard title="Vendas do Dia" value={formatCurrency(stats.salesDay)} subtext={`${stats.salesDayCount} vendas`} icon={ShoppingBag} gradient="bg-gradient-to-r from-primary to-pink-500" />
        <MetricCard title="Lucro do Dia" value={formatCurrency(stats.profitDay)} subtext={`${profitDayMargin}% de margem`} icon={DollarSign} gradient="bg-gradient-to-r from-green-400 to-teal-400" />
        <MetricCard title="Vendas do Mês" value={formatCurrency(stats.salesMonth)} subtext={`${stats.salesMonthCount} vendas`} icon={TrendingUp} gradient="bg-gradient-to-r from-primary to-pink-500" />
        <MetricCard title="Lucro do Mês" value={formatCurrency(stats.profitMonth)} subtext={`${profitMonthMargin}% de margem`} icon={Wallet} gradient="bg-gradient-to-r from-green-400 to-teal-400" />
        <MetricCard title="Despesas Pagas (Mês)" value={formatCurrency(stats.totalDespesasMes)} subtext="Total de despesas do mês" icon={ReceiptText} gradient="bg-gradient-to-r from-red-500 to-orange-500" />
        <MetricCard title="Margem de Lucro (Mês)" value={formatPercentage(stats.overallProfitMargin)} subtext="Lucro líquido sobre faturamento" icon={Percent} gradient="bg-gradient-to-r from-purple-500 to-indigo-500" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {isLoading ? <Card><div className="h-[420px] w-full animate-pulse bg-card rounded-lg"></div></Card> : <PerformanceChart data={data?.chartData || []} />}
        </div>
        <div className="lg:col-span-2">
          {isLoading ? <Card><div className="h-[420px] w-full animate-pulse bg-card rounded-lg"></div></Card> : <ChannelChart data={data?.channelData || []} />}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {isLoading ? <Card><div className="h-[420px] w-full animate-pulse bg-card rounded-lg"></div></Card> : <TopExpensesChart data={data?.topExpensesData || []} />}
        </div>
        <div className="lg:col-span-2">
          {isLoading ? <Card><div className="h-[420px] w-full animate-pulse bg-card rounded-lg"></div></Card> : <TopProductsList data={data?.topProductsData || []} />}
        </div>
      </div>
    </div>
  );
};

export default Index;