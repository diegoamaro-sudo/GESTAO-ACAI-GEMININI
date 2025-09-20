import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { PlusCircle, Trash2 } from 'lucide-react';

type ProdutoDetalhe = { id: string; nome: string; valor_venda: number; custo_unitario: number };
type CanalVendaDetalhe = { id: string; nome: string; taxa: number };
type ItemVendaState = { produto: ProdutoDetalhe; quantidade: number; subtotal: number };

// Tipo para a venda que será passada para o diálogo de edição
export type VendaParaEdicao = {
  id: string;
  canal_venda_id: string;
  frete: number;
  itens_venda: {
    produto_id: string;
    quantidade: number;
    valor_unitario: number;
    produtos: ProdutoDetalhe; // Para carregar os detalhes do produto
  }[];
};

const formSchema = z.object({
  canal_venda_id: z.string().uuid({ message: 'Selecione um canal de venda.' }),
  frete: z.coerce.number().min(0).default(0),
});

type EditarVendaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendaAtualizada: () => void;
  venda?: VendaParaEdicao | null;
};

export const EditarVendaDialog = ({ open, onOpenChange, onVendaAtualizada, venda }: EditarVendaDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoDetalhe[]>([]);
  const [canaisVenda, setCanaisVenda] = useState<CanalVendaDetalhe[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVendaState[]>([]);
  const [openPopover, setOpenPopover] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { frete: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;

      const { data: produtosData } = await supabase.from('produtos').select('id, nome, valor_venda, custo_unitario');
      const { data: canaisData } = await supabase.from('canais_venda').select('id, nome, taxa');
      setProdutos(produtosData || []);
      setCanaisVenda(canaisData || []);

      if (venda) {
        form.reset({
          canal_venda_id: venda.canal_venda_id,
          frete: venda.frete,
        });
        const loadedItens: ItemVendaState[] = venda.itens_venda.map(item => ({
          produto: item.produtos,
          quantidade: item.quantidade,
          subtotal: item.quantidade * item.valor_unitario,
        }));
        setItensVenda(loadedItens);
      } else {
        form.reset({ frete: 0, canal_venda_id: undefined });
        setItensVenda([]);
      }
    };
    fetchData();
  }, [open, venda, form]);

  const addProduto = (produto: ProdutoDetalhe) => {
    setItensVenda((prev) => {
      const existingItem = prev.find((item) => item.produto.id === produto.id);
      if (existingItem) {
        return prev.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1, subtotal: (item.quantidade + 1) * item.produto.valor_venda }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1, subtotal: produto.valor_venda }];
    });
  };

  const updateQuantidade = (produtoId: string, quantidade: number) => {
    setItensVenda((prev) =>
      prev.map((item) =>
        item.produto.id === produtoId
          ? { ...item, quantidade, subtotal: quantidade * item.produto.valor_venda }
          : item
      ).filter(item => item.quantidade > 0)
    );
  };
  
  const removeProduto = (produtoId: string) => {
    setItensVenda((prev) => prev.filter((item) => item.produto.id !== produtoId));
  };

  const { subtotalProdutos, lucroParcial, taxaCanal, valorTotal, lucroTotal } = useMemo(() => {
    const subtotalProdutos = itensVenda.reduce((acc, item) => acc + item.subtotal, 0);
    const custoTotalProdutos = itensVenda.reduce((acc, item) => acc + (item.produto.custo_unitario * item.quantidade), 0);
    const lucroParcial = subtotalProdutos - custoTotalProdutos;

    const canalId = form.watch('canal_venda_id');
    const frete = form.watch('frete') || 0;
    const canal = canaisVenda.find(c => c.id === canalId);
    const taxaPercentual = canal ? canal.taxa / 100 : 0;
    
    const taxaCanal = subtotalProdutos * taxaPercentual;
    const valorTotal = subtotalProdutos + frete - taxaCanal;
    const lucroTotal = lucroParcial - taxaCanal;

    return { subtotalProdutos, lucroParcial, taxaCanal, valorTotal, lucroTotal };
  }, [itensVenda, form.watch('canal_venda_id'), form.watch('frete'), canaisVenda]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !venda) return showError('Você precisa estar logado e selecionar uma venda para editar.');
    if (itensVenda.length === 0) return showError('Adicione pelo menos um produto à venda.');
    
    setIsSubmitting(true);

    const vendaData = {
      user_id: user.id,
      canal_venda_id: values.canal_venda_id,
      frete: values.frete,
      subtotal_produtos: subtotalProdutos,
      taxa_canal: taxaCanal,
      valor_total: valorTotal,
      lucro_total: lucroTotal,
    };

    const { error: vendaError } = await supabase.from('vendas').update(vendaData).eq('id', venda.id);

    if (vendaError) {
      showError('Erro ao atualizar venda: ' + vendaError?.message);
      setIsSubmitting(false);
      return;
    }

    // Delete existing items and insert new ones for simplicity
    const { error: deleteItemsError } = await supabase.from('itens_venda').delete().eq('venda_id', venda.id);
    if (deleteItemsError) {
      showError('Erro ao limpar itens antigos da venda: ' + deleteItemsError.message);
      setIsSubmitting(false);
      return;
    }

    const itensToInsert = itensVenda.map(item => ({
      venda_id: venda.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      valor_unitario: item.produto.valor_venda,
      subtotal: item.subtotal,
    }));

    const { error: insertItemsError } = await supabase.from('itens_venda').insert(itensToInsert);

    if (insertItemsError) {
      showError('Erro ao adicionar novos itens à venda: ' + insertItemsError.message);
    } else {
      showSuccess('Venda atualizada com sucesso!');
      onVendaAtualizada();
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Venda</DialogTitle>
          <DialogDescription>Atualize os produtos e detalhes da venda.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Itens da Venda</h3>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Produto
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" side="bottom" align="start">
                <Command>
                  <CommandInput placeholder="Buscar produto..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {produtos.map((produto) => (
                        <CommandItem
                          key={produto.id}
                          onSelect={() => {
                            addProduto(produto);
                            setOpenPopover(false);
                          }}
                        >
                          {produto.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="mt-4 max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensVenda.map(item => (
                    <TableRow key={item.produto.id}>
                      <TableCell>{item.produto.nome}</TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantidade} onChange={e => updateQuantidade(item.produto.id, parseInt(e.target.value) || 1)} className="h-8 w-16" />
                      </TableCell>
                      <TableCell>{item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeProduto(item.produto.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Detalhes e Totais</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="canal_venda_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal de Venda</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecione o canal" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {canaisVenda.map(canal => <SelectItem key={canal.id} value={canal.id}>{canal.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frete</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <div className="mt-4 space-y-2 rounded-lg border p-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal Produtos:</span> <span>{subtotalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa do Canal:</span> <span className="text-destructive">-{taxaCanal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete:</span> <span>{(form.watch('frete') || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-bold text-lg"><span >Valor Total:</span> <span>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-semibold text-success"><span>Lucro da Venda:</span> <span>{lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};