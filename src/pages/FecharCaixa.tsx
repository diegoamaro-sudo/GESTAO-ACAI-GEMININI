import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileDown, Edit } from 'lucide-react';
import MeiStatus from '@/components/MeiStatus';
import { TransferenciaDialog } from '@/components/TransferenciaDialog';
import { showSuccess, showError } from '@/utils/toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type FechamentoMensal = {
  id: string;
  mes: number;
  ano: number;
  faturamento: number;
  lucro_pj_distribuido?: number; // Adicionado para consistência, se existir no DB
  transferencia_pf: number;
};

const fetchFechamentos = async (userId: string | undefined) => {
  if (!userId) return { fechamentos: [], faturamentoAnual: 0 };

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // --- 1. Garantir que meses anteriores sejam fechados no faturamento_mensal ---
  const { data: lastFechamento } = await supabase
    .from('faturamento_mensal')
    .select('mes, ano')
    .eq('user_id', userId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)
    .single();

  let startMonth = lastFechamento ? lastFechamento.mes + 1 : 1;
  let startYear = lastFechamento ? lastFechamento.ano : currentYear;

  if (startMonth > 12) {
    startMonth = 1;
    startYear++;
  }

  for (let y = startYear; y <= currentYear; y++) {
    const endMonth = (y < currentYear) ? 12 : currentMonth - 1; // Fechar apenas até o mês anterior
    for (let m = (y === startYear ? startMonth : 1); m <= endMonth; m++) {
      const firstDay = new Date(y, m - 1, 1).toISOString();
      const lastDay = new Date(y, m, 0).toISOString();
      
      const { data: vendasMesFechado } = await supabase
        .from('vendas')
        .select('valor_total')
        .eq('user_id', userId)
        .gte('created_at', firstDay)
        .lte('created_at', lastDay);
      
      const faturamentoMes = vendasMesFechado?.reduce((acc, v) => acc + v.valor_total, 0) || 0;

      const { data: existingEntry } = await supabase
        .from('faturamento_mensal')
        .select('id')
        .eq('user_id', userId)
        .eq('mes', m)
        .eq('ano', y)
        .single();

      if (!existingEntry) {
        await supabase.from('faturamento_mensal').insert({
          user_id: userId,
          mes: m,
          ano: y,
          faturamento: faturamentoMes,
        });
      } else {
        // Opcional: Atualizar faturamento de meses já fechados se houver alteração
        await supabase.from('faturamento_mensal').update({ faturamento: faturamentoMes }).eq('id', existingEntry.id);
      }
    }
  }

  // --- 2. Buscar todos os fechamentos do ano corrente (incluindo os recém-criados) ---
  const { data: fechamentosData, error: fechamentosError } = await supabase
    .from('faturamento_mensal')
    .select('*')
    .eq('user_id', userId)
    .eq('ano', currentYear)
    .order('mes', { ascending: false });

  if (fechamentosError) {
    throw new Error('Erro ao buscar dados de fechamento mensal: ' + fechamentosError.message);
  }
  
  // Calcular faturamento anual a partir dos meses já fechados
  const faturamentoAnualFromClosedMonths = fechamentosData?.reduce((acc, f) => acc + f.faturamento, 0) || 0;

  // --- 3. Buscar vendas do MÊS ATUAL (que ainda não está em faturamento_mensal) ---
  const firstDayCurrentMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const lastDayCurrentMonth = new Date(currentYear, currentMonth, 0).toISOString();

  const { data: vendasCurrentMonth, error: vendasCurrentMonthError } = await supabase
    .from('vendas')
    .select('valor_total')
    .eq('user_id', userId)
    .gte('created_at', firstDayCurrentMonth)
    .lte('created_at', lastDayCurrentMonth);

  if (vendasCurrentMonthError) {
    throw new Error('Erro ao buscar vendas do mês atual: ' + vendasCurrentMonthError.message);
  }

  const faturamentoCurrentMonth = vendasCurrentMonth?.reduce((acc, v) => acc + v.valor_total, 0) || 0;

  // --- 4. Combinar para o faturamento anual total ---
  const faturamentoAnualTotal = faturamentoAnualFromClosedMonths + faturamentoCurrentMonth;

  // --- 5. Preparar a lista de fechamentos para exibição na tabela ---
  let allFechamentos: FechamentoMensal[] = [...(fechamentosData || [])];
  const currentMonthEntryIndex = allFechamentos.findIndex(f => f.mes === currentMonth && f.ano === currentYear);

  if (currentMonthEntryIndex === -1) {
    // Adicionar uma entrada temporária para o mês atual se não existir
    allFechamentos.push({
      id: `temp-${currentYear}-${currentMonth}`, // ID temporário
      mes: currentMonth,
      ano: currentYear,
      faturamento: faturamentoCurrentMonth,
      transferencia_pf: 0, // Valor padrão para o mês atual
    });
  } else {
    // Atualizar o faturamento do mês atual com o valor em tempo real
    allFechamentos[currentMonthEntryIndex] = {
      ...allFechamentos[currentMonthEntryIndex],
      faturamento: faturamentoCurrentMonth,
    };
  }

  // Ordenar por ano e mês decrescente
  allFechamentos.sort((a, b) => {
    if (b.ano !== a.ano) return b.ano - a.ano;
    return b.mes - a.mes;
  });

  return { fechamentos: allFechamentos, faturamentoAnual: faturamentoAnualTotal };
};

const FecharCaixa = () => {
  const { user, config } = useAuth(); // Obter config do AuthContext
  const queryClient = useQueryClient();
  
  const { data, isLoading: loading } = useQuery({
    queryKey: ['fechamentos', user?.id],
    queryFn: () => fetchFechamentos(user?.id),
    enabled: !!user,
  });

  const fechamentos = data?.fechamentos || [];
  const faturamentoAnual = data?.faturamentoAnual || 0;

  const limiteMei = config?.limite_mei || 81000; // Usar o limite do config, com fallback
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFechamento, setSelectedFechamento] = useState<FechamentoMensal | null>(null);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['fechamentos', user?.id] });
  };

  const handleEdit = (fechamento: FechamentoMensal) => {
    setSelectedFechamento(fechamento);
    setIsDialogOpen(true);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const acaiPurple = [76, 29, 149]; // Cor roxa do açaí

    // Cabeçalho
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(acaiPurple[0], acaiPurple[1], acaiPurple[2]);
    doc.text('Relatório Açaí do Chaves', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Faturamento Mensal', 105, 28, { align: 'center' });

    // Informações de Resumo
    doc.setFontSize(11);
    const currentYear = new Date().getFullYear();
    doc.text(`Ano Corrente: ${currentYear}`, 14, 45);
    doc.text(`Faturamento Anual Total: ${formatCurrency(faturamentoAnual)}`, 14, 51);

    // Tabela
    (doc as any).autoTable({
      startY: 60,
      head: [['Mês/Ano', 'Faturamento Bruto', 'Transferência para PF']],
      body: fechamentos.map(f => [
        `${f.mes}/${f.ano}`,
        formatCurrency(f.faturamento),
        formatCurrency(f.transferencia_pf)
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: acaiPurple,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 235, 245] // Um lilás bem claro
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

    doc.save('relatorio-acai-do-chaves.pdf');
    showSuccess('PDF personalizado gerado com sucesso!');
  };

  return (
    <>
      <TransferenciaDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
        fechamento={selectedFechamento}
      />
      <div className="space-y-6">
        <MeiStatus faturamentoAnual={faturamentoAnual} limiteMei={limiteMei} />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de Fechamento Mensal</CardTitle>
                <CardDescription>Visualize o resumo de cada mês e registre suas transferências.</CardDescription>
              </div>
              <Button onClick={handleExportPdf}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead className="text-right">Faturamento Bruto</TableHead>
                  <TableHead className="text-right">Transferência PF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                ) : fechamentos.length > 0 ? (
                  fechamentos.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.mes}/{f.ano}</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.faturamento)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(f.transferencia_pf)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} disabled={f.id.startsWith('temp-')}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center">Nenhum fechamento encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default FecharCaixa;