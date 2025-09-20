import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Package, DollarSign, Settings, ClipboardList, Building2, LogOut, Archive, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/ficha-tecnica', icon: ClipboardList, label: 'Ficha Técnica' },
  { href: '/fornecedores', icon: Building2, label: 'Fornecedores' },
  { href: '/despesas', icon: DollarSign, label: 'Despesas' },
  { href: '/historico-despesas', icon: History, label: 'Histórico Despesas' },
  { href: '/fechar-caixa', icon: Archive, label: 'Fechar Caixa' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-card md:flex">
      <div className="flex h-48 items-center justify-center border-b border-white/10 px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          {config?.logo_url ? (
            <img src={config.logo_url} alt="Logo da Loja" className="h-40 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <nav className="py-4">
          <div className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground transition-all hover:text-primary",
                  location.pathname === item.href && "bg-primary/10 text-primary font-bold"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="p-4">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;