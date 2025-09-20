import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 p-4 sm:px-6 sm:py-8 md:gap-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;