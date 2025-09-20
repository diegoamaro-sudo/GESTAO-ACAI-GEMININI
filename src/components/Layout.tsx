import { ReactNode } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex flex-col md:ml-[240px]">
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;