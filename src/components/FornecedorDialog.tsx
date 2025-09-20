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
import { Fornecedor } from '@/pages/Fornecedores';

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do fornecedor é obrigatório.' }),
});

type FornecedorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  fornecedor?: Fornecedor | null;
};

export const FornecedorDialog = ({ open, onOpenChange, onSuccess, fornecedor }: FornecedorDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '' },
  });

  useEffect(() => {
    if (fornecedor) {
      form.reset({ nome: fornecedor.nome });
    } else {
      form.reset({ nome: '' });
    }
  }, [fornecedor, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return showError('Você precisa estar logado.');
    setIsSubmitting(true);

    const fornecedorData = { user_id: user.id, ...values };

    let error;
    if (fornecedor) {
      const { error: updateError } = await supabase.from('fornecedores').update(fornecedorData).eq('id', fornecedor.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('fornecedores').insert(fornecedorData);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      showError(`Erro ao salvar fornecedor: ${error.message}`);
    } else {
      showSuccess(`Fornecedor ${fornecedor ? 'atualizado' : 'adicionado'} com sucesso!`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{fornecedor ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</DialogTitle>
          <DialogDescription>Preencha o nome do fornecedor.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Fornecedor</FormLabel>
                  <FormControl><Input placeholder="Ex: Açaí do Bom" {...field} /></FormControl>
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