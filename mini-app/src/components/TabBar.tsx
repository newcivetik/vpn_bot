import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Globe, User } from 'lucide-react';

const TABS = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/plans', icon: ShoppingBag, label: 'Тарифы' },
  { path: '/servers', icon: Globe, label: 'Серверы' },
  { path: '/profile', icon: User, label: 'Профиль' },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-tg-secondary/50 z-50">
      <div className="flex items-center justify-around px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-colors ${
                isActive ? 'text-brand-purple' : 'text-tg-hint'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
