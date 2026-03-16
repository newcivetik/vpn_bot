import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Activity, HelpCircle, ChevronRight, Users, Copy, Gift } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { api } from '../api/client';

export function ProfilePage() {
  const { subscription, setSubscription, firstName, setFirstName } = useUserStore();
  const { tg, initData, haptic } = useTelegram();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    referralCode: string;
    referralCount: number;
    referralBonusDays: number;
  } | null>(null);

  useEffect(() => {
    const user = tg?.initDataUnsafe?.user;
    if (user?.first_name) setFirstName(user.first_name);

    if (initData) {
      if (!subscription) {
        api.getSubscription(initData).then(setSubscription).catch(() => {});
      }
      api.getProfile(initData).then(setProfile).catch(() => {});
    }
  }, [initData, tg, subscription, setSubscription, setFirstName]);

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const trafficUsed = Number(subscription?.trafficUsedGB) || 0;
  const trafficLabel = subscription
    ? subscription.plan.trafficLimitGB > 0
      ? `${trafficUsed.toFixed(1)} / ${subscription.plan.trafficLimitGB} ГБ`
      : `${trafficUsed.toFixed(1)} ГБ`
    : '—';

  const botUsername = (tg as any)?.initDataUnsafe?.bot?.username;
  const referralLink = profile?.referralCode
    ? `https://t.me/${botUsername || 'bot'}?start=ref_${profile.referralCode}`
    : '';

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      haptic?.notificationOccurred('success');
    } catch {
      const input = document.createElement('textarea');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      haptic?.notificationOccurred('success');
    }
  };

  const handleShare = () => {
    if (!referralLink) return;
    const text = encodeURIComponent('Быстрый и безопасный VPN! Подключайся по моей ссылке:');
    const url = encodeURIComponent(referralLink);
    tg?.openTelegramLink(`https://t.me/share/url?url=${url}&text=${text}`);
  };

  return (
    <div className="p-4 pb-4 space-y-4">
      {/* Avatar & name */}
      <div className="flex items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
          <User size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-tg-text">{firstName || 'Пользователь'}</h1>
          <p className="text-sm text-tg-hint">
            {subscription ? `Тариф: ${subscription.plan.name}` : 'Нет активной подписки'}
          </p>
        </div>
      </div>

      {/* Subscription info */}
      {subscription && (
        <div className="bg-tg-secondary rounded-3xl p-4 space-y-3 animate-slide-up">
          <h2 className="text-sm font-bold text-tg-text">Подписка</h2>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-purple/10 flex items-center justify-center">
              <Calendar size={18} className="text-brand-purple" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-tg-text">{daysLeft} дн. осталось</div>
              <div className="text-xs text-tg-hint">
                до {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center">
              <Activity size={18} className="text-brand-blue" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-tg-text">Трафик: {trafficLabel}</div>
              <div className="text-xs text-tg-hint">
                {subscription.plan.trafficLimitGB > 0 ? 'Лимитированный' : 'Безлимитный'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral card */}
      {profile && (
        <div className="bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 rounded-3xl p-4 space-y-3 animate-slide-up">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-purple" />
            <h2 className="text-sm font-bold text-tg-text">Реферальная программа</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-tg-hint">Приглашено:</span>
                <span className="font-bold text-tg-text">{profile.referralCount}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-tg-hint">Бонус дней:</span>
                <span className="font-bold text-brand-green">{profile.referralBonusDays}</span>
              </div>
            </div>
            <Gift size={32} className="text-brand-purple/30" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyReferral}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tg-secondary active:scale-95 transition-transform"
            >
              <Copy size={14} className="text-brand-purple" />
              <span className="text-xs font-medium text-tg-text">Копировать</span>
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-primary active:scale-95 transition-transform"
            >
              <Users size={14} className="text-white" />
              <span className="text-xs font-medium text-white">Поделиться</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1 animate-slide-up">
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center gap-3 p-4 bg-tg-secondary rounded-2xl active:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <HelpCircle size={18} className="text-brand-green" />
          </div>
          <span className="flex-1 text-sm font-medium text-tg-text text-left">Как подключиться</span>
          <ChevronRight size={18} className="text-tg-hint" />
        </button>
      </div>
    </div>
  );
}
