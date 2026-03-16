import { LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.ts';

export function Header({ title }: { title: string }) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <button
        onClick={logout}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <LogOut size={16} />
        Выйти
      </button>
    </header>
  );
}
