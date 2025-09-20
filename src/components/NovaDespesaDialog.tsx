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
  FormDescription, // Adicionado aqui
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showSuccess, showError } from '@/utils/toast';
import { TipoDespesaDialog, TipoDespesa } from './TipoDespesaDialog';
import { PlusCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const formSchema = z.object({
  descricao: z.string().min(2, { message: 'A descrição é obrigatória.' }),
  valor: z.coerce.number().positive({ message: 'O valor deve ser positivo.' }),
  tipo_despesa_id: z.string().uuid({ message: 'Selecione um tipo de despesa.' }),
  recorrente: z.boolean().default(false).optional(),
  data_vencimento_dia: z.coerce.number().min(1).max(31).optional().nullable(),
});

type NovaDespesaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDespesaAdicionada: () => void;
  despesa?: Despesa | null; // Para edição
};

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  tipo_despesa_id: string;
  recorrente: boolean;
  data_vencimento_dia: number | null;
};

const fetchTiposDespesa = async (userId: string) => {
  const { data, error } = await supabase.from('tipos_despesa').select('*').eq('user_id', userId).order('nome');
  if (error) throw new Error('Erro ao buscar tipos de despesa: ' + error.message);
  return data || [];
};

export const NovaDespesaDialog = ({ open, onOpenChange, onDespesaAdicionada, despesa }: NovaDespesaDialogProps) => {
  console.log("NovaDespesaDialog renderizado, open:", open); // Adicionado para depuração
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTipoDespesaDialogOpen, setIsTipoDespesaDialogOpen] = useState(false);

  const { data: tiposDespesa, isLoading: loadingTipos } = useQuery<TipoDespesa[]>({
    queryKey: ['tiposDespesa', user?.id],
    queryFn: () => fetchTiposDespesa(user!.id),
    enabled: !!user && open, // Fetch only when dialog is open and user is available
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: '',
      valor: 0,
      tipo_despesa_id: undefined,
      recorrente: false,
      data_vencimento_dia: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (despesa) {
        form.reset({
          descricao: despesa.descricao,
          valor: despesa.valor,
          tipo_despesa_id: despesa.tipo_despesa_id,
          recorrente: despesa.recorrente,
          data_vencimento_dia: despesa.data_vencimento_dia,
        });
      } else {
        form.reset({
          descricao: '',
          valor: 0,
          tipo_despesa_id: tiposDespesa?.[0]?.id || undefined, // Set first type as default
          recorrente: false,
          data_vencimento_dia: undefined,
        });
      }
    }
  }, [despesa, open, form, tiposDespesa]);

  const isRecurring = form.watch('recorrente');

  const handleTipoDespesaSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tiposDespesa', user?.id] });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError('Você precisa estar logado para adicionar uma despesa.');
      return;
    }

    setIsSubmitting(true);

    const despesaData = {
      user_id: user.id,
      descricao: values.descricao,
      valor: values.valor,
      tipo_despesa_id: values.tipo_despesa_id,
      data: new Date().toISOString().split('T')[0], // Today's date for initial entry
      status: 'pendente', // Always starts as pending
      recorrente: values.recorrente,
      data_vencimento_dia: values.recorrente ? values.data_vencimento_dia : null,
    };

    let error;
    if (despesa) {
      const { error: updateError } = await supabase.from('despesas').update(despesaData).eq('id', despesa.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('despesas').insert(despesaData);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      showError('Erro ao salvar despesa: ' + error.message);
    } else {
      showSuccess(`Despesa ${despesa ? 'atualizada' : 'adicionada'} com sucesso!`);
      form.reset();
      onDespesaAdicionada();
      onOpenChange(false);
    }
  };

  return (
    <>
      <TipoDespesaDialog
        open={isTipoDespesaDialogOpen}
        onOpenChange={setIsTipoDespesaDialogOpen}
        onSuccess={handleTipoDespesaSuccess}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{despesa ? 'Editar Despesa' : 'Adicionar Nova Despesa'}</DialogTitle>
            <DialogDescription>
              Preencha as informações abaixo para registrar uma nova despesa.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Compra de embalagens" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_despesa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Despesa</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingTipos ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : tiposDespesa && tiposDespesa.length > 0 ? (
                            tiposDespesa.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                <span className="mr-2">{tipo.emoji}</span> {tipo.nome}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-types" disabled>Nenhum tipo encontrado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsTipoDespesaDialogOpen(true)}>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recorrente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Despesa Recorrente (Fixa)</FormLabel>
                      <FormDescription>
                        Marque se esta despesa se repete mensalmente.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              {isRecurring && (
                <FormField
                  control={form.control}
                  name="data_vencimento_dia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Vencimento (do mês)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" placeholder="Ex: 10" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};