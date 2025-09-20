import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { NovaVendaDialog } from './NovaVendaDialog';
import { NovaDespesaDialog } from './NovaDespesaDialog';
import { useQueryClient } from '@tanstack/react-query';

const Layout = ({ children }: { children: ReactNode }) => {
  const [isVendaDialogOpen, setIsVendaDialogOpen] = useState(false);
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSuccess = () => {
    // Invalida os caches relevantes para que os dados sejam atualizados automaticamente
    queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    queryClient.invalidateQueries({ queryKey: ['vendas'] });
    queryClient.invalidateQueries({ queryKey: ['despesas'] });
    queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
  };

  return (
    <>
      <NovaVendaDialog
        open={isVendaDialogOpen}
        onOpenChange={setIsVendaDialogOpen}
        onVendaAdicionada={handleSuccess}
      />
      <NovaDespesaDialog 
        open={isDespesaDialogOpen} 
        onOpenChange={setIsDespesaDialogOpen}
        onDespesaAdicionada={handleSuccess}
      />
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 md:pl-60">
          <Header 
            onNovaVendaClick={() => setIsVendaDialogOpen(true)}
            onNovaDespesaClick={() => {
              console.log("Header: Botão 'Nova Despesa' clicado, abrindo diálogo."); // Adicionado para depuração
              setIsDespesaDialogOpen(true);
            }}
          />
          <main className="flex-1 p-4 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default Layout;