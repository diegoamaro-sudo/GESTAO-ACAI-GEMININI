import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
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
import { showSuccess, showError } from '@/utils/toast';
import { EditarVendaDialog, VendaParaEdicao } from '@/components/EditarVendaDialog'; // Importar o novo diálogo

type Venda = {
  id: string;
  created_at: string;
  valor_total: number;
  lucro_total: number;
  canal_venda_id: string; // Adicionado para edição
  frete: number; // Adicionado para edição
  canais_venda: { nome: string } | null;
};

const fetchVendas = async () => {
  const { data, error } = await supabase
    .from('vendas')
    .select('id, created_at, valor_total, lucro_total, canal_venda_id, frete, canais_venda(nome)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Erro ao buscar vendas: ' + error.message);
  }
  return data as Venda[] || [];
};

const Vendas = () => {
  const queryClient = useQueryClient();
  const { data: vendas, isLoading } = useQuery({
    queryKey: ['vendas'],
    queryFn: fetchVendas,
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [vendaToEdit, setVendaToEdit] = useState<VendaParaEdicao | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vendas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); // Para atualizar o dashboard
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] }); // Para atualizar o fechamento de caixa
  };

  const handleEdit = async (venda: Venda) => {
    // Precisamos buscar os itens da venda para preencher o diálogo de edição
    const { data: itensVendaData, error: itensError } = await supabase
      .from('itens_venda')
      .select('produto_id, quantidade, valor_unitario, produtos(id, nome, valor_venda, custo_unitario)')
      .eq('venda_id', venda.id);

    if (itensError) {
      showError('Erro ao buscar itens da venda: ' + itensError.message);
      return;
    }

    setVendaToEdit({
      id: venda.id,
      canal_venda_id: venda.canal_venda_id,
      frete: venda.frete,
      itens_venda: itensVendaData || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (venda: Venda) => {
    setVendaToDelete(venda);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendaToDelete) return;

    // Primeiro, exclua os itens da venda
    const { error: deleteItemsError } = await supabase
      .from('itens_venda')
      .delete()
      .eq('venda_id', vendaToDelete.id);

    if (deleteItemsError) {
      showError('Erro ao excluir itens da venda: ' + deleteItemsError.message);
      return;
    }

    // Depois, exclua a venda em si
    const { error: deleteVendaError } = await supabase
      .from('vendas')
      .delete()
      .eq('id', vendaToDelete.id);

    if (deleteVendaError) {
      showError('Erro ao excluir venda: ' + deleteVendaError.message);
    } else {
      showSuccess('Venda excluída com sucesso!');
      handleSuccess();
    }
    setIsDeleteDialogOpen(false);
    setVendaToDelete(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <>
      <EditarVendaDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onVendaAtualizada={handleSuccess}
        venda={vendaToEdit}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a venda registrada em "{formatDate(vendaToDelete?.created_at || '')}".
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
          <CardTitle>Histórico de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : vendas && vendas.length > 0 ? (
                vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDate(venda.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{venda.canais_venda?.nome || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">{formatCurrency(venda.valor_total)}</TableCell>
                    <TableCell className="text-right text-success">{formatCurrency(venda.lucro_total)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(venda)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(venda)} className="text-destructive">
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhuma venda encontrada.
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

export default Vendas;