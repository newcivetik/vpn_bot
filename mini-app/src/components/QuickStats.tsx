import type { ReactNode } from 'react';
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
  children: ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/30"
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

  const trafficColor = trafficPct > 80 ? '#ef4444' : trafficPct > 50 ? '#f59e0b' : '#3b82f6';
  const serverLocation = subscription.server?.location || '—';

  return (
    <div className="grid grid-cols-2 gap-3 animate-slide-up">
      {/* Traffic */}
      <div
        className="bg-gradient-to-br from-[#FFE8D4] to-[#FFD4B8] rounded-3xl p-5 flex flex-col items-center shadow-[0_8px_32px_rgba(100,60,120,0.10)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] active:scale-95 cursor-default"
        aria-label={`Трафик: ${trafficLabel} ГБ`}
      >
        {hasLimit ? (
          <CircleProgress pct={trafficPct} color={trafficColor}>
            <span className="text-[10px] font-bold text-[#3D2C4E]">{trafficPct}%</span>
          </CircleProgress>
        ) : (
          <div className="text-[32px] leading-none mb-1">📊</div>
        )}
        <div className="text-2xl font-black text-[#3D2C4E] mt-1.5">{trafficLabel}</div>
        <div className="text-xs font-bold text-[#6B5A7A]">ГБ трафик</div>
      </div>

      {/* Days left */}
      <div
        className="bg-gradient-to-br from-[#FFD0D8] to-[#FFB6C1] rounded-3xl p-5 flex flex-col items-center shadow-[0_8px_32px_rgba(100,60,120,0.10)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] active:scale-95 cursor-default"
        aria-label={`Осталось ${daysLeft} дней`}
      >
        <div className="text-[32px] leading-none mb-1">📅</div>
        <div className="text-2xl font-black text-[#3D2C4E] mt-1.5">{daysLeft}</div>
        <div className="text-xs font-bold text-[#6B5A7A]">дн. осталось</div>
      </div>

      {/* Server */}
      <div
        className="col-span-2 bg-gradient-to-br from-[#D0EAFF] to-[#BDE0FE] rounded-3xl p-5 flex flex-col items-center shadow-[0_8px_32px_rgba(100,60,120,0.10)] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] active:scale-95 cursor-default"
        aria-label={`Сервер: ${serverLocation}`}
      >
        <div className="text-[32px] leading-none mb-1">🌐</div>
        <div className="text-2xl font-black text-[#3D2C4E] mt-1.5 truncate max-w-full">{serverLocation}</div>
        <div className="text-xs font-bold text-[#6B5A7A]">Сервер</div>
      </div>
    </div>
  );
}
