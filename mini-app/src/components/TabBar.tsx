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
    <nav aria-label="Основная навигация" className="fixed bottom-0 left-0 right-0 z-50 bg-[rgba(255,248,240,0.92)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] border-t border-[#E8D5F5]/40">
      <div className="flex items-center justify-around px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-3 px-5 rounded-2xl transition-all duration-300 min-w-[52px] min-h-[44px] active:scale-85 ${
                isActive
                  ? 'bg-gradient-to-br from-[#E8D5F5]/50 to-[#BDE0FE]/50 text-[#3D2C4E]'
                  : 'text-[#9B8AAB]'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold ${isActive ? 'text-[#3D2C4E]' : 'text-[#9B8AAB]'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
