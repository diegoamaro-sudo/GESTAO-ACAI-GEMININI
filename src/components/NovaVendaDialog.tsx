import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { showSuccess, showError } from '@/utils/toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type Produto = { id: string; nome: string; valor_venda: number; custo_unitario: number };
type CanalVenda = { id: string; nome: string; taxa: number };
type ItemVenda = { produto: Produto; quantidade: number; subtotal: number };
type TipoDespesa = { id: string; nome: string; emoji: string }; // Adicionado tipo para TipoDespesa

const formSchema = z.object({
  canal_venda_id: z.string().uuid({ message: 'Selecione um canal de venda.' }),
  frete: z.coerce.number().min(0).default(0),
  taxar_frete: z.boolean().default(false).optional(),
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
  const [tipoDespesaCustoId, setTipoDespesaCustoId] = useState<string | null>(null);
  const [tipoDespesaTaxaId, setTipoDespesaTaxaId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { frete: 0, taxar_frete: false },
  });

  // Função para buscar ou criar tipos de despesa padrão
  const getOrCreateTipoDespesa = async (userId: string, nome: string, emoji: string) => {
    let { data: tipo, error } = await supabase
      .from('tipos_despesa')
      .select('id')
      .eq('user_id', userId)
      .eq('nome', nome)
      .single();

    if (error && error.code === 'PGRST116') { // No rows found
      const { data: newTipo, error: insertError } = await supabase
        .from('tipos_despesa')
        .insert({ user_id: userId, nome, emoji })
        .select('id')
        .single();
      if (insertError) throw insertError;
      tipo = newTipo;
    } else if (error) {
      throw error;
    }
    return tipo?.id;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !user) return;
      
      try {
        const [produtosRes, canaisRes] = await Promise.all([
          supabase.from('produtos').select('id, nome, valor_venda, custo_unitario'),
          supabase.from('canais_venda').select('id, nome, taxa'),
        ]);

        if (produtosRes.error) throw produtosRes.error;
        if (canaisRes.error) throw canaisRes.error;

        setProdutos(produtosRes.data || []);
        setCanaisVenda(canaisRes.data || []);

        // Buscar ou criar tipos de despesa padrão
        const custoId = await getOrCreateTipoDespesa(user.id, 'Custo de Produto Vendido', '📦');
        const taxaId = await getOrCreateTipoDespesa(user.id, 'Taxa de Canal de Venda', '💸');
        setTipoDespesaCustoId(custoId);
        setTipoDespesaTaxaId(taxaId);

      } catch (error: any) {
        showError('Erro ao carregar dados: ' + error.message);
      }
    };
    fetchData();
  }, [open, user]);

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

  const { subtotalProdutos, custoTotalProdutos, taxaCanal, valorTotal, lucroTotal } = useMemo(() => {
    const subtotalProdutos = itensVenda.reduce((acc, item) => acc + item.subtotal, 0);
    const frete = form.watch('frete') || 0;
    const taxarFrete = form.watch('taxar_frete');
    const custoTotalProdutos = itensVenda.reduce((acc, item) => acc + (item.produto.custo_unitario * item.quantidade), 0);
    
    const canalId = form.watch('canal_venda_id');
    const canal = canaisVenda.find(c => c.id === canalId);
    const taxaPercentual = canal ? canal.taxa / 100 : 0;
    
    const baseForTax = subtotalProdutos + (taxarFrete ? frete : 0);
    const taxaCanal = baseForTax * taxaPercentual;
    
    const valorTotalCalculado = subtotalProdutos + frete; // Faturamento bruto
    const lucroTotalCalculado = valorTotalCalculado - custoTotalProdutos - taxaCanal; // Lucro real após custos e taxas

    return { subtotalProdutos, custoTotalProdutos, taxaCanal, valorTotal: valorTotalCalculado, lucroTotal: lucroTotalCalculado };
  }, [itensVenda, form.watch('canal_venda_id'), form.watch('frete'), form.watch('taxar_frete'), canaisVenda]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return showError('Você precisa estar logado.');
    if (itensVenda.length === 0) return showError('Adicione pelo menos um produto à venda.');
    if (!tipoDespesaCustoId || !tipoDespesaTaxaId) return showError('Tipos de despesa padrão não encontrados. Tente novamente.');
    
    setIsSubmitting(true);

    const vendaData = {
      user_id: user.id,
      canal_venda_id: values.canal_venda_id,
      frete: values.frete,
      taxar_frete: values.taxar_frete, // Incluindo o novo campo
      subtotal_produtos: subtotalProdutos,
      taxa_canal: taxaCanal,
      valor_total: valorTotal, // Faturamento bruto
      lucro_total: lucroTotal, // Lucro real
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
      setIsSubmitting(false);
      return;
    }

    // Registrar despesas de custo de produtos
    if (custoTotalProdutos > 0) {
      const { error: custoDespesaError } = await supabase.from('despesas').insert({
        user_id: user.id,
        descricao: `Custo dos produtos da venda #${novaVenda.id.substring(0, 8)}`,
        valor: custoTotalProdutos,
        tipo_despesa_id: tipoDespesaCustoId,
        data: new Date().toISOString().split('T')[0],
        status: 'paga', // Custo é sempre pago na venda
        recorrente: false,
        venda_id: novaVenda.id, // Vincular à venda
      });
      if (custoDespesaError) console.error('Erro ao registrar despesa de custo:', custoDespesaError);
    }

    // Registrar despesas de taxa de canal
    if (taxaCanal > 0) {
      const canalNome = canaisVenda.find(c => c.id === values.canal_venda_id)?.nome || 'Canal Desconhecido';
      const { error: taxaDespesaError } = await supabase.from('despesas').insert({
        user_id: user.id,
        descricao: `Taxa de ${canalNome} da venda #${novaVenda.id.substring(0, 8)}`,
        valor: taxaCanal,
        tipo_despesa_id: tipoDespesaTaxaId,
        data: new Date().toISOString().split('T')[0],
        status: 'paga', // Taxa é sempre paga na venda
        recorrente: false,
        venda_id: novaVenda.id, // Vincular à venda
      });
      if (taxaDespesaError) console.error('Erro ao registrar despesa de taxa:', taxaDespesaError);
    }

    showSuccess('Venda registrada com sucesso!');
    form.reset();
    setItensVenda([]);
    onVendaAdicionada();
    onOpenChange(false);
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
                {form.watch('frete') > 0 && (
                  <FormField
                    control={form.control}
                    name="taxar_frete"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Aplicar taxa do canal no frete</FormLabel>
                          <FormDescription>
                            Se ativado, a taxa do canal de venda também será calculada sobre o valor do frete.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </form>
            </Form>
            <div className="mt-4 space-y-2 rounded-lg border p-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal Produtos:</span> <span>{subtotalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete:</span> <span>{(form.watch('frete') || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-bold text-lg"><span >Faturamento Bruto:</span> <span>{valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Custo dos Produtos:</span> <span className="text-destructive">-{custoTotalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxa do Canal:</span> <span className="text-destructive">-{taxaCanal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              <div className="flex justify-between font-semibold text-success"><span>Lucro Líquido:</span> <span>{lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
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