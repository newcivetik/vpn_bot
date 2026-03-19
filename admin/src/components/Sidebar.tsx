import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Server,
  DollarSign,
  Tag,
  Gift,
  Megaphone,
  Shield,
  MessageCircle,
  ScrollText,
  Lock,
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Пользователи' },
  { to: '/subscriptions', icon: CreditCard, label: 'Подписки' },
  { to: '/plans', icon: Package, label: 'Тарифы' },
  { to: '/servers', icon: Server, label: 'Серверы' },
  { to: '/payments', icon: DollarSign, label: 'Платежи' },
  { to: '/promos', icon: Tag, label: 'Промокоды' },
  { to: '/personal-discounts', icon: Gift, label: 'Перс. скидки' },
  { to: '/support', icon: MessageCircle, label: 'Поддержка' },
  { to: '/broadcast', icon: Megaphone, label: 'Рассылка' },
  { to: '/logs', icon: ScrollText, label: 'Логи' },
  { to: '/security', icon: Lock, label: 'Безопасность' },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 text-white min-h-screen flex flex-col shrink-0">
      <div className="p-5 flex items-center gap-2 border-b border-slate-700">
        <Shield size={24} className="text-blue-400" />
        <span className="text-lg font-bold">VPN Admin</span>
      </div>
      <nav className="flex-1 py-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
