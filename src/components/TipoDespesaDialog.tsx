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
import { showSuccess, showError } from '@/utils/toast';

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do tipo de despesa é obrigatório.' }),
  emoji: z.string().min(1, { message: 'Um emoji é obrigatório.' }),
});

export type TipoDespesa = {
  id: string;
  nome: string;
  emoji: string;
};

type TipoDespesaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipoDespesa?: TipoDespesa | null;
};

export const TipoDespesaDialog = ({ open, onOpenChange, onSuccess, tipoDespesa }: TipoDespesaDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', emoji: '' },
  });

  useEffect(() => {
    if (tipoDespesa) {
      form.reset(tipoDespesa);
    } else {
      form.reset({ nome: '', emoji: '' });
    }
  }, [tipoDespesa, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return showError('Você precisa estar logado.');
    setIsSubmitting(true);

    const dataToSave = { user_id: user.id, ...values };

    let error;
    if (tipoDespesa) {
      const { error: updateError } = await supabase.from('tipos_despesa').update(dataToSave).eq('id', tipoDespesa.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('tipos_despesa').insert(dataToSave);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      showError(`Erro ao salvar tipo de despesa: ${error.message}`);
    } else {
      showSuccess(`Tipo de despesa ${tipoDespesa ? 'atualizado' : 'adicionado'} com sucesso!`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tipoDespesa ? 'Editar Tipo de Despesa' : 'Adicionar Novo Tipo de Despesa'}</DialogTitle>
          <DialogDescription>Preencha o nome e um emoji para o tipo de despesa.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Tipo</FormLabel>
                  <FormControl><Input placeholder="Ex: Marketing" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="emoji"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji</FormLabel>
                  <FormControl><Input placeholder="Ex: 📢" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};