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
  const hasLimit = subscription.plan.trafficLimitGB > 0;
  const trafficLabel = hasLimit
    ? `${traffic.toFixed(1)} / ${subscription.plan.trafficLimitGB}`
    : `${traffic.toFixed(1)} ГБ`;
  const trafficPct = hasLimit
    ? Math.min(100, Math.round((traffic / subscription.plan.trafficLimitGB) * 100))
    : 0;

  const daysPct = Math.min(100, Math.round(
    ((subscription.plan.durationDays - daysLeft) / subscription.plan.durationDays) * 100
  ));

  const serverLocation = subscription.server?.location || '—';

  return (
    <div className="grid grid-cols-3 gap-2 animate-slide-up">
      {/* Traffic */}
      <div className="bg-tg-secondary rounded-2xl p-3 text-center">
        <Activity size={18} className="mx-auto mb-1 text-brand-blue" />
        <div className="text-sm font-bold text-tg-text">{trafficLabel}</div>
        <div className="text-[10px] text-tg-hint mb-1">Трафик</div>
        {hasLimit && (
          <div className="h-1 bg-tg-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                trafficPct > 80 ? 'bg-brand-red' : trafficPct > 50 ? 'bg-brand-amber' : 'bg-brand-blue'
              }`}
              style={{ width: `${trafficPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Days left */}
      <div className="bg-tg-secondary rounded-2xl p-3 text-center">
        <Calendar size={18} className="mx-auto mb-1 text-brand-purple" />
        <div className="text-sm font-bold text-tg-text">{daysLeft} дн.</div>
        <div className="text-[10px] text-tg-hint mb-1">Осталось</div>
        <div className="h-1 bg-tg-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              daysLeft <= 3 ? 'bg-brand-red' : daysLeft <= 7 ? 'bg-brand-amber' : 'bg-brand-purple'
            }`}
            style={{ width: `${daysPct}%` }}
          />
        </div>
      </div>

      {/* Server */}
      <div className="bg-tg-secondary rounded-2xl p-3 text-center">
        <Globe size={18} className="mx-auto mb-1 text-brand-green" />
        <div className="text-sm font-bold text-tg-text truncate">{serverLocation}</div>
        <div className="text-[10px] text-tg-hint">Сервер</div>
      </div>
    </div>
  );
}
