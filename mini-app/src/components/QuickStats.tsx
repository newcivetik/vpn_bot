import { Activity, Calendar, Globe } from 'lucide-react';
import type { SubscriptionDTO } from '../api/client';

interface Props {
  subscription: SubscriptionDTO;
}

export function QuickStats({ subscription }: Props) {
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000
  ));
  const traffic = Number(subscription.trafficUsedGB) || 0;
  const trafficLabel = subscription.plan.trafficLimitGB > 0
    ? `${traffic.toFixed(1)} / ${subscription.plan.trafficLimitGB} ГБ`
    : `${traffic.toFixed(1)} ГБ`;

  const stats = [
    { icon: Activity, label: 'Трафик', value: trafficLabel, color: 'text-brand-blue' },
    { icon: Calendar, label: 'Осталось', value: `${daysLeft} дн.`, color: 'text-brand-purple' },
    { icon: Globe, label: 'Сервер', value: 'NL', color: 'text-brand-green' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 animate-slide-up">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-tg-secondary rounded-2xl p-3 text-center">
          <Icon size={18} className={`mx-auto mb-1 ${color}`} />
          <div className="text-sm font-bold text-tg-text">{value}</div>
          <div className="text-[10px] text-tg-hint">{label}</div>
        </div>
      ))}
    </div>
  );
}
