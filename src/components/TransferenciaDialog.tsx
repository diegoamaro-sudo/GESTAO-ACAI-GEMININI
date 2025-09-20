import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';

const formSchema = z.object({
  transferencia_pf: z.coerce.number().min(0, { message: 'O valor deve ser positivo.' }),
});

type FechamentoMensal = {
  id: string;
  mes: number;
  ano: number;
  transferencia_pf: number;
};

type TransferenciaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fechamento: FechamentoMensal | null;
};

export const TransferenciaDialog = ({ open, onOpenChange, onSuccess, fechamento }: TransferenciaDialogProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { transferencia_pf: 0 },
  });

  useEffect(() => {
    if (fechamento) {
      form.reset({ transferencia_pf: fechamento.transferencia_pf || 0 });
    }
  }, [fechamento, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!fechamento) return;

    const { error } = await supabase
      .from('faturamento_mensal')
      .update({ transferencia_pf: values.transferencia_pf })
      .eq('id', fechamento.id);

    if (error) {
      showError('Erro ao salvar transferência: ' + error.message);
    } else {
      showSuccess('Transferência registrada com sucesso!');
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Transferência para PF</DialogTitle>
          <DialogDescription>
            Informe o valor transferido para sua conta pessoal no mês de {fechamento?.mes}/{fechamento?.ano}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transferencia_pf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Transferido</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};