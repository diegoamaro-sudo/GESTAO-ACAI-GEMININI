import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { CustoItemDialog, CustoItem } from './CustoItemDialog';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome é obrigatório.' }),
  imagem_url: z.string().url({ message: 'Por favor, insira uma URL válida.' }).optional().or(z.literal('')),
});

type ComposicaoProduto = {
  id: string;
  nome: string;
  imagem_url?: string;
  custo_total_calculado: number;
};

type ComposicaoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  composicao?: ComposicaoProduto | null;
};

export const ComposicaoDialog = ({ open, onOpenChange, onSuccess, composicao }: ComposicaoDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustoItemDialogOpen, setIsCustoItemDialogOpen] = useState(false);
  const [custoItens, setCustoItens] = useState<CustoItem[]>([]);
  const [selectedCustoItem, setSelectedCustoItem] = useState<CustoItem | null>(null);
  const [itemOriginalId, setItemOriginalId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', imagem_url: '' },
  });

  useEffect(() => {
    const fetchCustoItens = async () => {
      if (composicao) {
        form.reset({ nome: composicao.nome, imagem_url: composicao.imagem_url || '' });
        const { data } = await supabase.from('custos_produtos').select('*, fornecedores(nome)').eq('produto_id', composicao.id);
        const formattedData = data?.map(item => ({
          ...item,
          fornecedor_nome: item.fornecedores?.nome || 'N/A'
        })) || [];
        setCustoItens(formattedData as CustoItem[]);
      } else {
        form.reset({ nome: '', imagem_url: '' });
        setCustoItens([]);
      }
    };
    if(open) fetchCustoItens();
  }, [composicao, open, form]);

  const handleSaveCustoItem = (item: CustoItem) => {
    setCustoItens(prev => {
      if (itemOriginalId) {
        return prev.map(i => i.id === itemOriginalId ? { ...item, id: itemOriginalId } : i);
      }
      return [...prev, { ...item, id: `temp-${Date.now()}` }];
    });
    setSelectedCustoItem(null);
    setItemOriginalId(null);
  };

  const handleEditCustoItem = (item: CustoItem) => {
    setSelectedCustoItem(item);
    setItemOriginalId(item.id!);
    setIsCustoItemDialogOpen(true);
  };
  
  const handleRemoveCustoItem = (itemId: string) => {
    setCustoItens(prev => prev.filter(i => i.id !== itemId));
  };

  const custoTotal = custoItens.reduce((acc, item) => acc + item.custo_unitario, 0);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return showError('Você precisa estar logado.');
    setIsSubmitting(true);

    const composicaoData = {
      user_id: user.id,
      nome: values.nome,
      imagem_url: values.imagem_url,
      custo_total_calculado: custoTotal,
    };

    let produtoId = composicao?.id;
    if (composicao) {
      const { error } = await supabase.from('produtos_fornecedores').update(composicaoData).eq('id', composicao.id);
      if (error) { showError(`Erro: ${error.message}`); setIsSubmitting(false); return; }
    } else {
      const { data, error } = await supabase.from('produtos_fornecedores').insert(composicaoData).select().single();
      if (error || !data) { showError(`Erro: ${error?.message}`); setIsSubmitting(false); return; }
      produtoId = data.id;
    }

    if (!produtoId) { showError('Falha ao obter ID do produto.'); setIsSubmitting(false); return; }

    const { error: deleteError } = await supabase.from('custos_produtos').delete().eq('produto_id', produtoId);
    if (deleteError) { showError(`Erro ao limpar custos antigos: ${deleteError.message}`); setIsSubmitting(false); return; }

    if (custoItens.length > 0) {
      const itensToInsert = custoItens.map(({ id, fornecedor_nome, ...rest }) => ({ ...rest, produto_id: produtoId }));
      const { error: insertError } = await supabase.from('custos_produtos').insert(itensToInsert);
      if (insertError) { showError(`Erro ao salvar itens de custo: ${insertError.message}`); setIsSubmitting(false); return; }
    }

    showSuccess('Ficha técnica salva com sucesso!');
    onSuccess();
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <>
      <CustoItemDialog
        open={isCustoItemDialogOpen}
        onOpenChange={setIsCustoItemDialogOpen}
        onSave={handleSaveCustoItem}
        item={selectedCustoItem}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{composicao ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}</DialogTitle>
            <DialogDescription>Crie a composição de custos para um produto final.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Produto Final</FormLabel><FormControl><Input placeholder="Ex: Açaí 500ml com adicionais" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="imagem_url" render={({ field }) => (
                  <FormItem><FormLabel>URL da Imagem (Opcional)</FormLabel><FormControl><Input placeholder="https://exemplo.com/imagem.png" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </form>
          </Form>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Itens de Custo</CardTitle>
                  <CardDescription>Adicione os ingredientes que compõem este produto.</CardDescription>
                </div>
                <Button type="button" onClick={() => { setSelectedCustoItem(null); setItemOriginalId(null); setIsCustoItemDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Custo por Porção</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {custoItens.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.fornecedor_nome}</TableCell>
                      <TableCell className="text-right text-red-500">{item.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCustoItem(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCustoItem(item.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-right font-bold text-lg text-red-500">
                Custo Total do Produto: {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <DialogFooter>
            <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Ficha Técnica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};