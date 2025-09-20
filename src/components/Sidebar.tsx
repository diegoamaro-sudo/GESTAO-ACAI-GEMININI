import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Package, DollarSign, Settings, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/ficha-tecnica', icon: ClipboardList, label: 'Ficha Técnica' },
  { href: '/despesas', icon: DollarSign, label: 'Despesas' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6 text-primary" />
          <span>Açaí Manager</span>
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
                location.pathname === item.href && "bg-accent text-primary"
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