import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, DollarSign, Settings, ClipboardList, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/ficha-tecnica', icon: ClipboardList, label: 'Ficha Técnica' },
  { href: '/fornecedores', icon: Building2, label: 'Fornecedores' },
  { href: '/despesas', icon: DollarSign, label: 'Despesas' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-primary">AÇAÍ DO CHAVES</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4">
        <div className="grid items-start px-4 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                location.pathname === item.href && "bg-primary text-primary-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;