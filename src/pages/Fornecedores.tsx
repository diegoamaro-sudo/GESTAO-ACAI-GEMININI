import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FornecedorDialog } from '@/components/FornecedorDialog';
import { showSuccess, showError } from '@/utils/toast';

export type Fornecedor = {
  id: string;
  nome: string;
};

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);

  const fetchFornecedores = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fornecedores').select('*').order('nome', { ascending: true });
    if (error) showError('Erro ao buscar fornecedores: ' + error.message);
    else setFornecedores(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const handleEdit = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedFornecedor(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (fornecedor: Fornecedor) => {
    setFornecedorToDelete(fornecedor);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fornecedorToDelete) return;
    const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedorToDelete.id);
    if (error) showError('Erro ao excluir fornecedor: ' + error.message);
    else {
      showSuccess('Fornecedor excluído com sucesso!');
      fetchFornecedores();
    }
    setIsDeleteDialogOpen(false);
    setFornecedorToDelete(null);
  };

  return (
    <>
      <FornecedorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={fetchFornecedores}
        fornecedor={selectedFornecedor}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o fornecedor "{fornecedorToDelete?.nome}".
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>Gerencie seus fornecedores de produtos e ingredientes.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Fornecedor</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="text-center">Carregando...</TableCell></TableRow>
              ) : fornecedores.length > 0 ? (
                fornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(fornecedor)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(fornecedor)} className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={2} className="text-center">Nenhum fornecedor encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default Fornecedores;