import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do item é obrigatório.' }),
  valor_total: z.coerce.number().positive({ message: 'O valor deve ser positivo.' }),
  quantidade: z.coerce.number().int().positive({ message: 'O rendimento deve ser um número inteiro positivo.' }),
});

export type CustoItem = z.infer<typeof formSchema> & { id?: string, custo_unitario: number };

type CustoItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: CustoItem) => void;
  item?: CustoItem | null;
};

export const CustoItemDialog = ({ open, onOpenChange, onSave, item }: CustoItemDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', valor_total: 0, quantidade: 1 },
  });

  useEffect(() => {
    if (item) {
      form.reset(item);
    } else {
      form.reset({ nome: '', valor_total: 0, quantidade: 1 });
    }
  }, [item, open, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const custo_unitario = values.valor_total / values.quantidade;
    onSave({ ...values, id: item?.id, custo_unitario });
    onOpenChange(false);
  };

  const valorTotal = form.watch('valor_total');
  const quantidade = form.watch('quantidade');
  const custoUnitario = quantidade > 0 ? valorTotal / quantidade : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item de Custo' : 'Adicionar Item de Custo'}</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do ingrediente ou insumo. O custo unitário será calculado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Item</FormLabel>
                  <FormControl><Input placeholder="Ex: Leite em Pó (lata 400g)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Total Pago</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="R$ 6,00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rendimento (em porções)</FormLabel>
                  <FormControl><Input type="number" placeholder="20" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between font-semibold text-blue-600">
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