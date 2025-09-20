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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { Instagram, Truck, Phone, Store } from 'lucide-react';

const iconMap = {
  Instagram: <Instagram className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />,
  Phone: <Phone className="h-4 w-4" />,
  Store: <Store className="h-4 w-4" />,
};

const formSchema = z.object({
  nome: z.string().min(2, { message: 'O nome do canal é obrigatório.' }),
  taxa: z.coerce.number().min(0, { message: 'A taxa deve ser um valor positivo.' }).default(0),
  icon: z.enum(['Instagram', 'Truck', 'Phone', 'Store']),
});

type CanalVenda = {
  id: string;
  nome: string;
  taxa: number;
  icon: 'Instagram' | 'Truck' | 'Phone' | 'Store';
};

type CanalVendaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  canal?: CanalVenda | null;
};

export const CanalVendaDialog = ({ open, onOpenChange, onSuccess, canal }: CanalVendaDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      taxa: 0,
      icon: 'Store',
    },
  });

  useEffect(() => {
    if (canal) {
      form.reset(canal);
    } else {
      form.reset({
        nome: '',
        taxa: 0,
        icon: 'Store',
      });
    }
  }, [canal, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return showError('Você precisa estar logado.');
    setIsSubmitting(true);

    const canalData = {
      user_id: user.id,
      ...values,
    };

    let error;
    if (canal) {
      const { error: updateError } = await supabase.from('canais_venda').update(canalData).eq('id', canal.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('canais_venda').insert(canalData);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      showError(`Erro ao salvar canal: ${error.message}`);
    } else {
      showSuccess(`Canal ${canal ? 'atualizado' : 'adicionado'} com sucesso!`);
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{canal ? 'Editar Canal de Venda' : 'Adicionar Novo Canal'}</DialogTitle>
          <DialogDescription>Preencha as informações do canal de venda.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Canal</FormLabel>
                  <FormControl><Input placeholder="Ex: iFood" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxa (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="Ex: 12.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ícone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.keys(iconMap).map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            {iconMap[iconName as keyof typeof iconMap]}
                            {iconName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Canal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};