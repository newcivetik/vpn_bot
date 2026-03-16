import type { ReactNode } from 'react';
import { TabBar } from './TabBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-safe">
      {children}
      <TabBar />
    </div>
  );
}
