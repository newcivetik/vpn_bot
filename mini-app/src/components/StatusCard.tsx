import { MapPin } from 'lucide-react';
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
    ? 'bg-gradient-to-br from-[#F0E4FA] to-[#E8D5F5]'
    : isExpiring
      ? 'bg-gradient-to-br from-[#FFE0E5] to-[#FFB6C1]'
      : isWarning
        ? 'bg-gradient-to-br from-[#FFF3E4] to-[#FFD4B8]'
        : 'bg-gradient-to-br from-[#D4F7E8] to-[#C1F0DB]';

  const statusEmoji = !isActive ? '🔒' : isExpiring ? '⚠️' : '🛡️';

  const serverLocation = subscription?.server?.location;
  const serverFlag = serverLocation ? (LOCATION_FLAGS[serverLocation] || '🌐') : null;

  return (
    <div
      role="status"
      aria-label={isActive ? `VPN активен, ${daysLeft} дней осталось` : 'VPN не активен'}
      className={`rounded-[32px] p-6 text-center shadow-[0_8px_32px_rgba(100,60,120,0.10)] relative overflow-hidden animate-fade-in ${gradient}`}
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div
          className="text-[48px] leading-none animate-float"
          aria-hidden="true"
        >
          {statusEmoji}
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-black text-[#3D2C4E]">
            {!isActive
              ? 'Нет подписки'
              : isExpiring
                ? 'Подписка истекает!'
                : 'Защита активна'}
          </span>
          <span className="text-sm font-semibold text-[#6B5A7A]">
            {isActive
              ? `${subscription!.plan.name} — ${daysLeft} дн. осталось`
              : 'Подключи VPN и будь в безопасности'}
          </span>
          {isActive && serverLocation && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={12} className="text-[#6B5A7A]" />
              <span className="text-xs text-[#6B5A7A]">{serverFlag} {serverLocation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
