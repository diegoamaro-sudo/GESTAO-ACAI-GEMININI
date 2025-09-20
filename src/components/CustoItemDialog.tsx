import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError } from '@/utils/toast';

export type CustoItem = {
  id?: string;
  nome: string;
  valor_total: number;
  quantidade: number;
  custo_unitario: number;
  fornecedor_id: string;
  fornecedor_nome?: string;
};

type Fornecedor = {
  id: string;
  nome: string;
};

const formSchema = z.object({
  fornecedor_id: z.string().uuid({ message: 'Selecione um fornecedor.' }),
  nome: z.string().min(2, { message: 'O nome do item é obrigatório.' }),
  valor_total: z.coerce.number().positive({ message: 'O valor deve ser maior que zero.' }),
  quantidade: z.coerce.number().positive({ message: 'A quantidade deve ser maior que zero.' }),
});

type CustoItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: CustoItem) => void;
  item?: CustoItem | null;
};

export const CustoItemDialog = ({ open, onOpenChange, onSave, item }: CustoItemDialogProps) => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', valor_total: 0, quantidade: 1 },
  });

  useEffect(() => {
    const fetchFornecedores = async () => {
      const { data, error } = await supabase.from('fornecedores').select('id, nome');
      if (error) showError('Erro ao buscar fornecedores.');
      else setFornecedores(data || []);
    };
    if (open) {
      fetchFornecedores();
      if (item) {
        form.reset(item);
      } else {
        form.reset({ nome: '', valor_total: 0, quantidade: 1, fornecedor_id: undefined });
      }
    }
  }, [item, open, form]);

  const valorTotal = form.watch('valor_total');
  const quantidade = form.watch('quantidade');
  const custoUnitario = quantidade > 0 ? valorTotal / quantidade : 0;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedFornecedor = fornecedores.find(f => f.id === values.fornecedor_id);
    onSave({
      ...values,
      custo_unitario: custoUnitario,
      fornecedor_nome: selectedFornecedor?.nome || 'N/A',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item de Custo' : 'Adicionar Item de Custo'}</DialogTitle>
          <DialogDescription>Preencha os detalhes do ingrediente ou item de custo.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fornecedor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qual fornecedor?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem><FormLabel>Qual o produto?</FormLabel><FormControl><Input placeholder="Ex: Granola" {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor_total"
              render={({ field }) => (
                <FormItem><FormLabel>Qual valor?</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 19.00" {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem><FormLabel>Quantidade?</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between font-semibold text-green-500">
                <span>Custo por Porção:</span>
                <span>{custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Salvar Item</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};