import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do produto é obrigatório.' }),
  custo_unitario: z.coerce.number().min(0, { message: 'O custo deve ser positivo.' }).default(0),
  valor_venda: z.coerce.number().positive({ message: 'O valor de venda deve ser maior que zero.' }),
});

type Produto = {
  id: string;
  nome: string;
  custo_unitario: number;
  valor_venda: number;
};

type ProdutoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  produto?: Produto | null;
};

export const ProdutoDialog = ({ open, onOpenChange, onSuccess, produto }: ProdutoDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      custo_unitario: 0,
      valor_venda: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (produto) {
        form.reset(produto);
      } else {
        form.reset({
          nome: '',
          custo_unitario: 0,
          valor_venda: 0,
        });
      }
    }
  }, [produto, open, form]);

  const custo = form.watch('custo_unitario') || 0;
  const valorVenda = form.watch('valor_venda') || 0;
  const lucro = valorVenda - custo;
  const margemLucro = valorVenda > 0 ? (lucro / valorVenda) * 100 : 0;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError('Você precisa estar logado.');
      return;
    }

    setIsSubmitting(true);

    const produtoData = {
      user_id: user.id,
      nome: values.nome,
      custo_unitario: values.custo_unitario,
      valor_venda: values.valor_venda,
      lucro: lucro,
      margem_lucro: margemLucro,
    };

    let error;
    if (produto) {
      const { error: updateError } = await supabase.from('produtos').update(produtoData).eq('id', produto.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('produtos').insert(produtoData);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      showError(`Erro ao salvar produto: ${error.message}`);
    } else {
      showSuccess(`Produto ${produto ? 'atualizado' : 'adicionado'} com sucesso!`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{produto ? 'Editar Produto' : 'Adicionar Novo Produto'}</DialogTitle>
          <DialogDescription>
            Preencha as informações do produto. O lucro e a margem serão calculados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Açaí 500ml" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="custo_unitario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Unitário</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="valor_venda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de Venda</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between font-semibold text-success">
                <span>Lucro:</span>
                <span>{lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Margem de Lucro:</span>
                <span>{margemLucro.toFixed(2)}%</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};