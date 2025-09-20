import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  tipo_despesa_id: string;
  tipos_despesa: { nome: string; emoji: string } | null;
  data: string;
  status: 'pendente' | 'paga';
  recorrente: boolean;
  data_vencimento_dia: number | null;
};

type TipoDespesa = {
  id: string;
  nome: string;
  emoji: string;
};

const fetchHistoricoDespesas = async (userId: string, mes: number | null, ano: number | null, tipoDespesaId: string | null) => {
  let query = supabase
    .from('despesas')
    .select('*, tipos_despesa(nome, emoji)')
    .eq('user_id', userId)
    .eq('recorrente', false) // Only instances, not templates
    .order('data', { ascending: false });

  if (mes) {
    const startOfMonth = new Date(ano || new Date().getFullYear(), mes - 1, 1).toISOString();
    const endOfMonth = new Date(ano || new Date().getFullYear(), mes, 0).toISOString();
    query = query.gte('data', startOfMonth).lte('data', endOfMonth);
  }
  if (ano && !mes) { // If only year is selected, filter for the whole year
    const startOfYear = new Date(ano, 0, 1).toISOString();
    const endOfYear = new Date(ano, 11, 31).toISOString();
    query = query.gte('data', startOfYear).lte('data', endOfYear);
  }
  if (tipoDespesaId) {
    query = query.eq('tipo_despesa_id', tipoDespesaId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Erro ao buscar histórico de despesas: ' + error.message);
  }
  return data || [];
};

const fetchTiposDespesa = async (userId: string) => {
  const { data, error } = await supabase.from('tipos_despesa').select('*').eq('user_id', userId).order('nome');
  if (error) throw new Error('Erro ao buscar tipos de despesa: ' + error.message);
  return data || [];
};

const HistoricoDespesas = () => {
  const { user } = useAuth();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(today.getFullYear());
  const [selectedTipoDespesa, setSelectedTipoDespesa] = useState<string | null>(null);

  const { data: historicoDespesas, isLoading } = useQuery<Despesa[]>({
    queryKey: ['historicoDespesas', user?.id, selectedMonth, selectedYear, selectedTipoDespesa],
    queryFn: () => fetchHistoricoDespesas(user!.id, selectedMonth, selectedYear, selectedTipoDespesa),
    enabled: !!user,
  });

  const { data: tiposDespesa, isLoading: isLoadingTipos } = useQuery<TipoDespesa[]>({
    queryKey: ['tiposDespesa', user?.id],
    queryFn: () => fetchTiposDespesa(user!.id),
    enabled: !!user,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i); // Current year +/- 2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Despesas</CardTitle>
        <CardDescription>Visualize todas as despesas passadas e filtre por período ou tipo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Select value={selectedMonth?.toString() || ''} onValueChange={(value) => setSelectedMonth(value === '' ? null : Number(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os Meses</SelectItem>
              {monthNames.map((name, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear?.toString() || ''} onValueChange={(value) => setSelectedYear(value === '' ? null : Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filtrar por Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os Anos</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTipoDespesa || ''} onValueChange={(value) => setSelectedTipoDespesa(value === '' ? null : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os Tipos</SelectItem>
              {isLoadingTipos ? (
                <SelectItem value="loading" disabled>Carregando...</SelectItem>
              ) : tiposDespesa && tiposDespesa.length > 0 ? (
                tiposDespesa.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    <span className="mr-2">{tipo.emoji}</span> {tipo.nome}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-types" disabled>Nenhum tipo encontrado</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Data</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : historicoDespesas && historicoDespesas.length > 0 ? (
              historicoDespesas.map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell className="font-medium">{despesa.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {despesa.tipos_despesa?.emoji} {despesa.tipos_despesa?.nome || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(despesa.valor)}</TableCell>
                  <TableCell className="text-right">{formatDate(despesa.data)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={despesa.status === 'paga' ? 'success' : 'secondary'}>
                      {despesa.status === 'paga' ? 'Paga' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhuma despesa encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default HistoricoDespesas;