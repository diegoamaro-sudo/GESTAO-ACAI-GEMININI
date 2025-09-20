import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle, CalendarDays } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { NovaDespesaDialog } from '@/components/NovaDespesaDialog';
import { showSuccess, showError } from '@/utils/toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  status: 'pendente' | 'paga';
  recorrente: boolean;
  data_vencimento_dia: number | null;
};

const fetchDespesas = async (userId: string, mes: number, ano: number) => {
  const startOfMonth = new Date(ano, mes - 1, 1).toISOString();
  const endOfMonth = new Date(ano, mes, 0).toISOString();

  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('user_id', userId)
    .gte('data', startOfMonth)
    .lte('data', endOfMonth)
    .order('data', { ascending: false });

  if (error) {
    throw new Error('Erro ao buscar despesas: ' + error.message);
  }
  return data || [];
};

const Despesas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const { data: despesas, isLoading } = useQuery<Despesa[]>({
    queryKey: ['despesas', user?.id, currentMonth, currentYear],
    queryFn: () => fetchDespesas(user!.id, currentMonth, currentYear),
    enabled: !!user,
  });

  const [isNovaDespesaDialogOpen, setIsNovaDespesaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [despesaToDelete, setDespesaToDelete] = useState<Despesa | null>(null);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['despesas', user?.id, currentMonth, currentYear] });
    queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Invalida o dashboard para atualizar totais
  };

  const handleDelete = (despesa: Despesa) => {
    setDespesaToDelete(despesa);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!despesaToDelete) return;
    const { error } = await supabase.from('despesas').delete().eq('id', despesaToDelete.id);
    if (error) {
      showError('Erro ao excluir despesa: ' + error.message);
    } else {
      showSuccess('Despesa excluída com sucesso!');
      handleSuccess();
    }
    setIsDeleteDialogOpen(false);
    setDespesaToDelete(null);
  };

  const toggleStatus = async (despesa: Despesa) => {
    const newStatus = despesa.status === 'pendente' ? 'paga' : 'pendente';
    const { error } = await supabase
      .from('despesas')
      .update({ status: newStatus })
      .eq('id', despesa.id);

    if (error) {
      showError('Erro ao atualizar status: ' + error.message);
    } else {
      showSuccess(`Despesa marcada como ${newStatus === 'paga' ? 'Paga' : 'Pendente'}!`);
      handleSuccess();
    }
  };

  const handleGenerateMonthlyExpenses = async () => {
    if (!user) {
      showError('Você precisa estar logado para gerar despesas.');
      return;
    }
    const { error } = await supabase.rpc('generate_monthly_recurring_expenses', {
      p_user_id: user.id,
      p_mes: currentMonth,
      p_ano: currentYear,
    });

    if (error) {
      showError('Erro ao gerar despesas recorrentes: ' + error.message);
    } else {
      showSuccess('Despesas recorrentes geradas/atualizadas para o mês!');
      handleSuccess();
    }
  };

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
    <>
      <NovaDespesaDialog
        open={isNovaDespesaDialogOpen}
        onOpenChange={setIsNovaDespesaDialogOpen}
        onDespesaAdicionada={handleSuccess}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a despesa "{despesaToDelete?.descricao}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciar Despesas</CardTitle>
              <CardDescription>Visualize, adicione e gerencie suas despesas fixas e variáveis.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleGenerateMonthlyExpenses} variant="outline">
                <CalendarDays className="mr-2 h-4 w-4" /> Gerar Despesas do Mês
              </Button>
              <Button onClick={() => setIsNovaDespesaDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={String(currentMonth)} onValueChange={(value) => setCurrentMonth(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((name, index) => (
                  <SelectItem key={index + 1} value={String(index + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(currentYear)} onValueChange={(value) => setCurrentYear(Number(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Data</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : despesas && despesas.length > 0 ? (
                despesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell className="font-medium">{despesa.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={despesa.categoria === 'fixa' ? 'destructive' : 'secondary'}>
                        {despesa.categoria === 'fixa' ? 'Fixa' : 'Variável'}
                      </Badge>
                      {despesa.recorrente && <Badge variant="outline" className="ml-2">Recorrente</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(despesa.valor)}</TableCell>
                    <TableCell className="text-right">{formatDate(despesa.data)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(despesa)}
                        className={cn(
                          "flex items-center gap-1",
                          despesa.status === 'paga' ? "text-success hover:text-success/80" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        {despesa.status === 'paga' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {despesa.status === 'paga' ? 'Paga' : 'Pendente'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => toggleStatus(despesa)}>
                            Marcar como {despesa.status === 'paga' ? 'Pendente' : 'Paga'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(despesa)} className="text-destructive">
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Nenhuma despesa encontrada para este mês.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default Despesas;