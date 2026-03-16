import { Shield, ShieldOff } from 'lucide-react';
import type { SubscriptionDTO } from '../api/client';

interface Props {
  subscription: SubscriptionDTO | null;
}

export function StatusCard({ subscription }: Props) {
  const isActive = !!subscription;
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div
      className={`rounded-3xl p-5 text-white relative overflow-hidden animate-fade-in ${
        isActive ? 'bg-gradient-success' : 'bg-gradient-to-br from-gray-400 to-gray-500'
      }`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

      <div className="relative z-10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
          {isActive ? <Shield size={28} /> : <ShieldOff size={28} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse-soft" />}
            <span className="font-bold text-lg">
              {isActive ? 'Защита активна' : 'Нет подписки'}
            </span>
          </div>
          <span className="text-sm text-white/80">
            {isActive
              ? `${subscription!.plan.name} — ${daysLeft} дн. осталось`
              : 'Подключи VPN и будь в безопасности'}
          </span>
        </div>
      </div>
    </div>
  );
}
