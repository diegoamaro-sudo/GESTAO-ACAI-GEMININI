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

type Produto = { id: string; nome: string; valor_venda: number; custo_unitario: number };
type CanalVenda = { id: string; nome: string; taxa: number };
type ItemVenda = { produto: Produto; quantidade: number; subtotal: number };

const formSchema = z.object({
  canal_venda_id: z.string().uuid({ message: 'Selecione um canal de venda.' }),
  frete: z.coerce.number().min(0).default(0),
});

type NovaVendaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendaAdicionada: () => void;
};

export const NovaVendaDialog = ({ open, onOpenChange, onVendaAdicionada }: NovaVendaDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [canaisVenda, setCanaisVenda] = useState<CanalVenda[]>([]);
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
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
    };
    fetchData();
  }, [open]);

  const addProduto = (produto: Produto) => {
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
    if (!user) return showError('Você precisa estar logado.');
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

    const { data: novaVenda, error: vendaError } = await supabase.from('vendas').insert(vendaData).select().single();

    if (vendaError || !novaVenda) {
      showError('Erro ao criar venda: ' + vendaError?.message);
      setIsSubmitting(false);
      return;
    }

    const itensData = itensVenda.map(item => ({
      venda_id: novaVenda.id,
      produto_id: item.produto.id,
      quantidade: item.quantidade,
      valor_unitario: item.produto.valor_venda,
      subtotal: item.subtotal,
    }));

    const { error: itensError } = await supabase.from('itens_venda').insert(itensData);

    if (itensError) {
      showError('Erro ao adicionar itens à venda: ' + itensError.message);
      // Here you might want to delete the created sale for consistency
    } else {
      showSuccess('Venda registrada com sucesso!');
      form.reset();
      setItensVenda([]);
      onVendaAdicionada();
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar Nova Venda</DialogTitle>
          <DialogDescription>Adicione produtos e preencha os detalhes da venda.</DialogDescription>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa do Canal:</span> <span className="text-red-500">-{taxaCanal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete:</span> <span>{(form.watch('frete') || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-bold text-lg"><span >Valor Total:</span> <span>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-semibold text-green-600"><span>Lucro da Venda:</span> <span>{lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Venda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};