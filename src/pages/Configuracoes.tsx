import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Instagram, Truck, Phone, Store } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { showSuccess, showError } from '@/utils/toast';
import { CanalVendaDialog } from '@/components/CanalVendaDialog';

// Schemas
const configFormSchema = z.object({
  nome_loja: z.string().min(2, { message: 'O nome da loja é obrigatório.' }),
  limite_mei: z.coerce.number().positive({ message: 'O limite deve ser um valor positivo.' }),
});

// Types
type CanalVenda = { id: string; nome: string; taxa: number; icon: 'Instagram' | 'Truck' | 'Phone' | 'Store' };
type ConfiguracoesUsuario = z.infer<typeof configFormSchema>;

const iconMap = {
  Instagram: <Instagram className="h-5 w-5 text-muted-foreground" />,
  Truck: <Truck className="h-5 w-5 text-muted-foreground" />,
  Phone: <Phone className="h-5 w-5 text-muted-foreground" />,
  Store: <Store className="h-5 w-5 text-muted-foreground" />,
};

const Configuracoes = () => {
  const { user } = useAuth();
  // State for General Config
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
  // State for Sales Channels
  const [canais, setCanais] = useState<CanalVenda[]>([]);
  const [loadingCanais, setLoadingCanais] = useState(true);
  const [isCanalDialogOpen, setIsCanalDialogOpen] = useState(false);
  const [selectedCanal, setSelectedCanal] = useState<CanalVenda | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [canalToDelete, setCanalToDelete] = useState<CanalVenda | null>(null);

  // Form for General Config
  const configForm = useForm<ConfiguracoesUsuario>({
    resolver: zodResolver(configFormSchema),
  });

  // Fetch initial data
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('configuracoes_usuario')
        .select('nome_loja, limite_mei')
        .eq('user_id', user.id)
        .single();
      if (data) configForm.reset(data);
      if (error) showError('Erro ao buscar configurações.');
    };
    
    const fetchCanais = async () => {
      setLoadingCanais(true);
      const { data, error } = await supabase.from('canais_venda').select('*').order('nome');
      if (error) showError('Erro ao buscar canais de venda.');
      else setCanais(data || []);
      setLoadingCanais(false);
    };

    fetchConfig();
    fetchCanais();
  }, [user, configForm]);

  // Handlers for General Config
  const onConfigSubmit = async (values: ConfiguracoesUsuario) => {
    if (!user) return;
    setIsSubmittingConfig(true);
    const { error } = await supabase
      .from('configuracoes_usuario')
      .update(values)
      .eq('user_id', user.id);
    if (error) showError('Erro ao salvar configurações: ' + error.message);
    else showSuccess('Configurações salvas com sucesso!');
    setIsSubmittingConfig(false);
  };

  // Handlers for Sales Channels
  const handleEditCanal = (canal: CanalVenda) => {
    setSelectedCanal(canal);
    setIsCanalDialogOpen(true);
  };
  const handleAddNewCanal = () => {
    setSelectedCanal(null);
    setIsCanalDialogOpen(true);
  };
  const handleDeleteCanal = (canal: CanalVenda) => {
    setCanalToDelete(canal);
    setIsDeleteDialogOpen(true);
  };
  const confirmDeleteCanal = async () => {
    if (!canalToDelete) return;
    const { error } = await supabase.from('canais_venda').delete().eq('id', canalToDelete.id);
    if (error) {
      showError('Erro ao excluir canal: ' + error.message);
    } else {
      showSuccess('Canal excluído com sucesso!');
      setCanais(canais.filter(c => c.id !== canalToDelete.id));
    }
    setIsDeleteDialogOpen(false);
    setCanalToDelete(null);
  };

  return (
    <>
      <CanalVendaDialog
        open={isCanalDialogOpen}
        onOpenChange={setIsCanalDialogOpen}
        onSuccess={() => {
          const fetchCanais = async () => {
            const { data } = await supabase.from('canais_venda').select('*').order('nome');
            setCanais(data || []);
          };
          fetchCanais();
        }}
        canal={selectedCanal}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o canal "{canalToDelete?.nome}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCanal}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
            <CardDescription>Ajuste as configurações principais da sua loja.</CardDescription>
          </CardHeader>
          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit(onConfigSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={configForm.control}
                  name="nome_loja"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Loja</FormLabel>
                      <FormControl><Input placeholder="Açaí do Chaves" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={configForm.control}
                  name="limite_mei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite Anual MEI</FormLabel>
                      <FormControl><Input type="number" step="1000" placeholder="81000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isSubmittingConfig}>
                  {isSubmittingConfig ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Canais de Venda</CardTitle>
                <CardDescription>Gerencie onde você vende seus produtos e suas taxas.</CardDescription>
              </div>
              <Button onClick={handleAddNewCanal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Canal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[64px]">Ícone</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Taxa (%)</TableHead>
                  <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCanais ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                ) : canais.map(canal => (
                  <TableRow key={canal.id}>
                    <TableCell>{iconMap[canal.icon]}</TableCell>
                    <TableCell className="font-medium">{canal.nome}</TableCell>
                    <TableCell className="text-right">{canal.taxa}%</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditCanal(canal)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteCanal(canal)} className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Configuracoes;