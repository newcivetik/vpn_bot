import { Globe } from 'lucide-react';
import type { SubscriptionDTO } from '../api/client';

interface Props {
  subscription: SubscriptionDTO;
}

function CircleProgress({
  pct,
  color,
  size = 48,
  strokeWidth = 4,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-tg-bg"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function QuickStats({ subscription }: Props) {
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000
  ));
  const traffic = Number(subscription.trafficUsedGB) || 0;
  const hasLimit = subscription.plan.trafficLimitGB > 0;
  const trafficLabel = hasLimit
    ? `${traffic.toFixed(1)}/${subscription.plan.trafficLimitGB}`
    : `${traffic.toFixed(1)}`;
  const trafficPct = hasLimit
    ? Math.min(100, Math.round((traffic / subscription.plan.trafficLimitGB) * 100))
    : 0;

  const daysUsedPct = Math.min(100, Math.round(
    ((subscription.plan.durationDays - daysLeft) / subscription.plan.durationDays) * 100
  ));

  const trafficColor = trafficPct > 80 ? '#ef4444' : trafficPct > 50 ? '#f59e0b' : '#3b82f6';
  const daysColor = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#8b5cf6';
  const serverLocation = subscription.server?.location || '—';

  return (
    <div className="grid grid-cols-3 gap-2 animate-slide-up">
      {/* Traffic */}
      <div className="bg-tg-secondary rounded-2xl p-3 flex flex-col items-center">
        {hasLimit ? (
          <CircleProgress pct={trafficPct} color={trafficColor}>
            <span className="text-[10px] font-bold text-tg-text">{trafficPct}%</span>
          </CircleProgress>
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-brand-blue">&infin;</span>
          </div>
        )}
        <div className="text-[11px] font-bold text-tg-text mt-1.5">{trafficLabel}</div>
        <div className="text-[10px] text-tg-hint">ГБ трафик</div>
      </div>

      {/* Days left */}
      <div className="bg-tg-secondary rounded-2xl p-3 flex flex-col items-center">
        <CircleProgress pct={daysUsedPct} color={daysColor}>
          <span className="text-xs font-bold text-tg-text">{daysLeft}</span>
        </CircleProgress>
        <div className="text-[11px] font-bold text-tg-text mt-1.5">дн.</div>
        <div className="text-[10px] text-tg-hint">Осталось</div>
      </div>

      {/* Server */}
      <div className="bg-tg-secondary rounded-2xl p-3 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center">
          <Globe size={20} className="text-brand-green" />
        </div>
        <div className="text-[11px] font-bold text-tg-text mt-1.5 truncate max-w-full">{serverLocation}</div>
        <div className="text-[10px] text-tg-hint">Сервер</div>
      </div>
    </div>
  );
}
