import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { NovaVendaDialog } from './NovaVendaDialog';
import { NovaDespesaDialog } from './NovaDespesaDialog';

const Layout = ({ children }: { children: ReactNode }) => {
  const [isVendaDialogOpen, setIsVendaDialogOpen] = useState(false);
  const [isDespesaDialogOpen, setIsDespesaDialogOpen] = useState(false);

  // This is a placeholder. In a real app, you'd have a callback to refresh data.
  const handleSuccess = () => {
    window.location.reload();
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
            onNovaDespesaClick={() => setIsDespesaDialogOpen(true)}
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