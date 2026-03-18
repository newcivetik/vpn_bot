import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { ToastContainer } from './Toast.tsx';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      <ToastContainer />
    </div>
  );
}
