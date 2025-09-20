import { ReactNode } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 md:pl-60">
        <div className="p-4 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;