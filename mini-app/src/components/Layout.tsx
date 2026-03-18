import type { ReactNode } from 'react';
import { TabBar } from './TabBar';
import { ToastContainer } from './Toast';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe">
      <ToastContainer />
      {children}
      <TabBar />
    </div>
  );
}
