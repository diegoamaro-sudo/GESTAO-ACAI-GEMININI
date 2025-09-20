import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, ImageOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ComposicaoDialog } from '@/components/ComposicaoDialog';
import { showSuccess, showError } from '@/utils/toast';

type ComposicaoProduto = {
  id: string;
  nome: string;
  imagem_url?: string;
  custo_total_calculado: number;
};

const fetchComposicoes = async () => {
  const { data, error } = await supabase.from('produtos_fornecedores').select('*').order('nome', { ascending: true });
  if (error) throw new Error('Erro ao buscar fichas técnicas: ' + error.message);
  return data || [];
};

const FichaTecnica = () => {
  const queryClient = useQueryClient();
  const { data: composicoes, isLoading: loading } = useQuery<ComposicaoProduto[]>({
    queryKey: ['composicoes'],
    queryFn: fetchComposicoes,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComposicao, setSelectedComposicao] = useState<ComposicaoProduto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [composicaoToDelete, setComposicaoToDelete] = useState<ComposicaoProduto | null>(null);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['composicoes'] });
  };

  const handleEdit = (composicao: ComposicaoProduto) => {
    setSelectedComposicao(composicao);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedComposicao(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (composicao: ComposicaoProduto) => {
    setComposicaoToDelete(composicao);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!composicaoToDelete) return;
    const { error } = await supabase.from('produtos_fornecedores').delete().eq('id', composicaoToDelete.id);
    if (error) {
      showError('Erro ao excluir ficha técnica: ' + error.message);
    } else {
      showSuccess('Ficha técnica excluída com sucesso!');
      handleSuccess();
    }
    setIsDeleteDialogOpen(false);
    setComposicaoToDelete(null);
  };

  return (
    <>
      <ComposicaoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
        composicao={selectedComposicao}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a ficha técnica "{composicaoToDelete?.nome}".
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
              <CardTitle>Ficha Técnica</CardTitle>
              <CardDescription>Crie e gerencie a composição de custos dos seus produtos.</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nova Ficha Técnica
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Carregando...</p>
          ) : composicoes && composicoes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {composicoes.map((composicao) => (
                <Card key={composicao.id} className="overflow-hidden flex flex-col">
                  <div className="relative">
                    {composicao.imagem_url ? (
                      <img src={composicao.imagem_url} alt={composicao.nome} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full bg-muted flex items-center justify-center">
                        <ImageOff className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="secondary" className="rounded-full h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(composicao)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(composicao)} className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <h3 className="font-semibold truncate mb-2">{composicao.nome}</h3>
                    <p className="text-sm text-destructive font-semibold">Custo Total: {composicao.custo_total_calculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">Nenhuma ficha técnica encontrada.</h3>
              <p className="text-muted-foreground">Comece criando uma para calcular os custos dos seus produtos.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default FichaTecnica;