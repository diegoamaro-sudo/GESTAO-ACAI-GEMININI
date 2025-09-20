import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

type HeaderProps = {
  onNovaVendaClick: () => void;
  onNovaDespesaClick: () => void;
};

const Header = ({ onNovaVendaClick, onNovaDespesaClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="ml-auto flex items-center gap-4">
        <Button 
          onClick={onNovaVendaClick}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold transition-transform hover:scale-105"
        >
          Nova Venda
        </Button>
        <Button 
          onClick={onNovaDespesaClick}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 transition-colors"
        >
          Nova Despesa
        </Button>
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};

export default Header;