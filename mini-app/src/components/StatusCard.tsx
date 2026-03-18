import { Shield, ShieldOff, AlertTriangle, MapPin } from 'lucide-react';
import type { SubscriptionDTO } from '../api/client';

const LOCATION_FLAGS: Record<string, string> = {
  'Нидерланды': '🇳🇱', 'Германия': '🇩🇪', 'Финляндия': '🇫🇮', 'США': '🇺🇸',
  'Сингапур': '🇸🇬', 'Турция': '🇹🇷', 'Великобритания': '🇬🇧', 'Франция': '🇫🇷',
  'Япония': '🇯🇵', 'Канада': '🇨🇦',
};

interface Props {
  subscription: SubscriptionDTO | null;
}

export function StatusCard({ subscription }: Props) {
  const isActive = !!subscription;
  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const isExpiring = isActive && daysLeft <= 3;
  const isWarning = isActive && daysLeft <= 7 && daysLeft > 3;

  const gradient = !isActive
    ? 'bg-gradient-to-br from-gray-400 to-gray-500'
    : isExpiring
      ? 'bg-gradient-to-br from-brand-red to-brand-orange'
      : isWarning
        ? 'bg-gradient-to-br from-brand-amber to-brand-orange'
        : 'bg-gradient-success';

  const serverLocation = subscription?.server?.location;
  const serverFlag = serverLocation ? (LOCATION_FLAGS[serverLocation] || '🌐') : null;

  return (
    <div
      className={`rounded-3xl p-5 text-white relative overflow-hidden animate-fade-in ${gradient}`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-6 -translate-x-6" />

      <div className="relative z-10 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
          {!isActive ? (
            <ShieldOff size={28} />
          ) : isExpiring ? (
            <AlertTriangle size={28} />
          ) : (
            <Shield size={28} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {isActive && (
              <div className={`w-2 h-2 rounded-full ${isExpiring ? 'bg-white animate-pulse' : 'bg-white animate-pulse-soft'}`} />
            )}
            <span className="font-bold text-lg">
              {!isActive
                ? 'Нет подписки'
                : isExpiring
                  ? 'Подписка истекает!'
                  : 'Защита активна'}
            </span>
          </div>
          <span className="text-sm text-white/80">
            {isActive
              ? `${subscription!.plan.name} — ${daysLeft} дн. осталось`
              : 'Подключи VPN и будь в безопасности'}
          </span>
          {isActive && serverLocation && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <MapPin size={12} className="text-white/60" />
              <span className="text-xs text-white/60">{serverFlag} {serverLocation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
