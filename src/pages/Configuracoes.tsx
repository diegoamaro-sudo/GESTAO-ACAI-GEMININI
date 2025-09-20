import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Instagram, Truck, Phone, Store, ImageOff } from 'lucide-react';
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

const fetchCanais = async (userId: string) => {
  const { data, error } = await supabase.from('canais_venda').select('*').eq('user_id', userId).order('nome');
  if (error) throw new Error('Erro ao buscar canais de venda.');
  return data || [];
};

const Configuracoes = () => {
  const { user, config, refetchConfig } = useAuth();
  const queryClient = useQueryClient();
  
  // State for General Config
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);
  // State for Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmittingLogo, setIsSubmittingLogo] = useState(false);
  // State for Sales Channels Dialogs
  const [isCanalDialogOpen, setIsCanalDialogOpen] = useState(false);
  const [selectedCanal, setSelectedCanal] = useState<CanalVenda | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [canalToDelete, setCanalToDelete] = useState<CanalVenda | null>(null);

  // Data fetching with React Query
  const { data: canais, isLoading: loadingCanais } = useQuery<CanalVenda[]>({
    queryKey: ['canais', user?.id],
    queryFn: () => fetchCanais(user!.id),
    enabled: !!user,
  });

  // Form for General Config
  const configForm = useForm<ConfiguracoesUsuario>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      nome_loja: '',
      limite_mei: 81000,
    }
  });

  useEffect(() => {
    if (config) {
      configForm.reset({
        nome_loja: config.nome_loja || '',
        limite_mei: config.limite_mei || 81000,
      });
      setLogoPreview(config.logo_url || null);
    }
  }, [config, configForm]);

  // Handlers for General Config
  const onConfigSubmit = async (values: ConfiguracoesUsuario) => {
    if (!user) return;
    setIsSubmittingConfig(true);
    const { error } = await supabase
      .from('configuracoes_usuario')
      .update(values)
      .eq('user_id', user.id);
    if (error) showError('Erro ao salvar configurações: ' + error.message);
    else {
      showSuccess('Configurações salvas com sucesso!');
      refetchConfig();
    }
    setIsSubmittingConfig(false);
  };

  // Handlers for Logo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const onLogoSubmit = async () => {
    if (!logoFile || !user) return;
    setIsSubmittingLogo(true);

    const filePath = `public/${user.id}-${Date.now()}-${logoFile.name}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, logoFile);

    if (uploadError) {
      showError(`Erro no upload da imagem: ${uploadError.message}`);
      setIsSubmittingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath);
    const { error: dbError } = await supabase
      .from('configuracoes_usuario')
      .update({ logo_url: urlData.publicUrl })
      .eq('user_id', user.id);

    if (dbError) {
      showError(`Erro ao salvar a logo: ${dbError.message}`);
    } else {
      showSuccess('Logo atualizada com sucesso!');
      refetchConfig();
    }
    setIsSubmittingLogo(false);
    setLogoFile(null);
  };

  // Handlers for Sales Channels
  const handleCanalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['canais', user?.id] });
  };
  const handleEditCanal = (canal: CanalVenda) => { setSelectedCanal(canal); setIsCanalDialogOpen(true); };
  const handleAddNewCanal = () => { setSelectedCanal(null); setIsCanalDialogOpen(true); };
  const handleDeleteCanal = (canal: CanalVenda) => { setCanalToDelete(canal); setIsDeleteDialogOpen(true); };
  const confirmDeleteCanal = async () => {
    if (!canalToDelete) return;
    const { error } = await supabase.from('canais_venda').delete().eq('id', canalToDelete.id);
    if (error) showError('Erro ao excluir canal: ' + error.message);
    else {
      showSuccess('Canal excluído com sucesso!');
      handleCanalSuccess();
    }
    setIsDeleteDialogOpen(false);
    setCanalToDelete(null);
  };

  return (
    <>
      <CanalVendaDialog open={isCanalDialogOpen} onOpenChange={setIsCanalDialogOpen} onSuccess={handleCanalSuccess} canal={selectedCanal} />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o canal "{canalToDelete?.nome}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteCanal}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Configurações Gerais</CardTitle><CardDescription>Ajuste as configurações principais da sua loja.</CardDescription></CardHeader>
            <Form {...configForm}>
              <form onSubmit={configForm.handleSubmit(onConfigSubmit)}>
                <CardContent className="space-y-4">
                  <FormField control={configForm.control} name="nome_loja" render={({ field }) => (<FormItem><FormLabel>Nome da Loja</FormLabel><FormControl><Input placeholder="Açaí do Chaves" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={configForm.control} name="limite_mei" render={({ field }) => (<FormItem><FormLabel>Limite Anual MEI</FormLabel><FormControl><Input type="number" step="1000" placeholder="81000" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
                <CardFooter className="border-t px-6 py-4"><Button type="submit" disabled={isSubmittingConfig}>{isSubmittingConfig ? 'Salvando...' : 'Salvar'}</Button></CardFooter>
              </form>
            </Form>
          </Card>
          <Card>
            <CardHeader><CardTitle>Logo da Loja</CardTitle><CardDescription>Envie a imagem da sua marca.</CardDescription></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="w-64 h-64 rounded-lg border bg-muted flex items-center justify-center">
                {logoPreview ? <img src={logoPreview} alt="Prévia da logo" className="h-full w-full object-contain rounded-lg" /> : <ImageOff className="h-12 w-12 text-muted-foreground" />}
              </div>
              <Input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} className="text-sm" />
            </CardContent>
            <CardFooter className="border-t px-6 py-4"><Button onClick={onLogoSubmit} disabled={!logoFile || isSubmittingLogo} className="w-full">{isSubmittingLogo ? 'Enviando...' : 'Salvar Logo'}</Button></CardFooter>
          </Card>
        </div>

        <Card>
          <CardHeader><div className="flex items-center justify-between"><div><CardTitle>Canais de Venda</CardTitle><CardDescription>Gerencie onde você vende seus produtos e suas taxas.</CardDescription></div><Button onClick={handleAddNewCanal}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Canal</Button></div></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead className="w-[64px]">Ícone</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Taxa (%)</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingCanais ? (<TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>) : canais && canais.length > 0 ? canais.map(canal => (<TableRow key={canal.id}><TableCell>{iconMap[canal.icon]}</TableCell><TableCell className="font-medium">{canal.nome}</TableCell><TableCell className="text-right">{canal.taxa}%</TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuItem onClick={() => handleEditCanal(canal)}>Editar</DropdownMenuItem><DropdownMenuItem onClick={() => handleDeleteCanal(canal)} className="text-destructive">Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="text-center">Nenhum canal de venda encontrado.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Configuracoes;