import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Activity, HelpCircle, ChevronRight, Users, Copy, Gift, Award, History, Bell, BellOff } from 'lucide-react';
import type { SubscriptionDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { api } from '../api/client';
import { toast } from '../components/Toast';

export function ProfilePage() {
  const { subscription, setSubscription, firstName, setFirstName } = useUserStore();
  const { tg, initData, haptic } = useTelegram();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    referralCode: string;
    referralCount: number;
    referralBonusDays: number;
    isReturning: boolean;
    totalSubscriptions: number;
    notifyBeforeExpiry: boolean;
  } | null>(null);
  const [history, setHistory] = useState<SubscriptionDTO[]>([]);

  useEffect(() => {
    const user = tg?.initDataUnsafe?.user;
    if (user?.first_name) setFirstName(user.first_name);

    if (initData) {
      if (!subscription) {
        api.getSubscription(initData).then(setSubscription).catch((e) => {
          console.error('Failed to load subscription:', e);
        });
      }
      api.getProfile(initData).then(setProfile).catch((e) => {
        console.error('Failed to load profile:', e);
      });
      api.getSubscriptions(initData).then(setHistory).catch((e) => {
        console.error('Failed to load history:', e);
      });
    }
  }, [initData, tg, subscription, setSubscription, setFirstName]);

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const traffic = Number(subscription?.trafficUsedGB) || 0;
  const trafficLabel = subscription
    ? subscription.plan.trafficLimitGB > 0
      ? `${traffic.toFixed(1)} / ${subscription.plan.trafficLimitGB} ГБ`
      : `${traffic.toFixed(1)} ГБ`
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
      toast('Ссылка скопирована');
    } catch {
      const input = document.createElement('textarea');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      haptic?.notificationOccurred('success');
      toast('Ссылка скопирована');
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
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-purple">
          <User size={28} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-tg-text">{firstName || 'Пользователь'}</h1>
          <p className="text-sm text-tg-hint">
            {subscription ? `Тариф: ${subscription.plan.name}` : 'Нет активной подписки'}
          </p>
        </div>
      </div>

      {/* Profile completeness */}
      {!subscription && (
        <div className="bg-gradient-to-br from-brand-purple/5 to-brand-blue/5 rounded-3xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-tg-text">Профиль</span>
            <span className="text-xs font-bold text-brand-purple">1 из 3</span>
          </div>
          <div className="h-1.5 bg-tg-secondary rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-primary rounded-full" />
          </div>
          <p className="text-xs text-tg-hint mt-2">Подключи VPN и активируй реферальную программу</p>
        </div>
      )}

      {/* Subscription info */}
      {subscription && (
        <div className="bg-tg-secondary rounded-3xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
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
        <div className="bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 rounded-3xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
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
              aria-label="Копировать реферальную ссылку"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tg-secondary active:scale-95 transition-transform"
            >
              <Copy size={14} className="text-brand-purple" />
              <span className="text-xs font-medium text-tg-text">Копировать</span>
            </button>
            <button
              onClick={handleShare}
              aria-label="Поделиться реферальной ссылкой"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-primary active:scale-95 transition-transform"
            >
              <Users size={14} className="text-white" />
              <span className="text-xs font-medium text-white">Поделиться</span>
            </button>
          </div>
        </div>
      )}

      {/* Loyalty card */}
      {profile?.isReturning && (
        <div className="bg-gradient-to-br from-brand-amber/10 to-brand-orange/10 rounded-3xl p-4 space-y-2 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2">
            <Award size={18} className="text-brand-amber" />
            <h2 className="text-sm font-bold text-tg-text">Лояльность</h2>
          </div>
          <div className="text-sm text-tg-hint">
            Всего подписок: <span className="font-bold text-tg-text">{profile.totalSubscriptions}</span>
          </div>
          <div className="text-xs text-tg-hint">
            Используй промокод <span className="font-bold text-brand-amber">RENEW15</span> для скидки 15% при продлении
          </div>
        </div>
      )}

      {/* Subscription history */}
      {history.length > 1 && (
        <div className="bg-tg-secondary rounded-3xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2">
            <History size={18} className="text-tg-hint" />
            <h2 className="text-sm font-bold text-tg-text">История подписок</h2>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((sub) => {
              const isActive = sub.status === 'active';
              return (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-green animate-pulse-soft' : 'bg-tg-hint'}`} />
                    <span className="text-tg-text">{sub.plan.name}</span>
                  </div>
                  <span className="text-xs text-tg-hint">
                    {new Date(sub.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications toggle */}
      {profile && (
        <div className="bg-tg-secondary rounded-3xl p-4 animate-slide-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <button
            role="switch"
            aria-checked={profile.notifyBeforeExpiry}
            onClick={async () => {
              if (!initData) return;
              const newValue = !profile.notifyBeforeExpiry;
              try {
                await api.toggleNotifications(newValue, initData);
                setProfile({ ...profile, notifyBeforeExpiry: newValue });
                haptic?.notificationOccurred('success');
                toast(newValue ? 'Уведомления включены' : 'Уведомления отключены');
              } catch {
                toast('Ошибка');
              }
            }}
            className="w-full flex items-center gap-3 active:opacity-80 transition-opacity"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${profile.notifyBeforeExpiry ? 'bg-brand-purple/10' : 'bg-tg-hint/10'}`}>
              {profile.notifyBeforeExpiry ? <Bell size={18} className="text-brand-purple" /> : <BellOff size={18} className="text-tg-hint" />}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-tg-text">Уведомления</div>
              <div className="text-xs text-tg-hint">Напоминание об окончании подписки</div>
            </div>
            <div className={`w-11 h-[26px] rounded-full transition-colors duration-200 relative ${profile.notifyBeforeExpiry ? 'bg-brand-purple' : 'bg-tg-hint/30'}`}>
              <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${profile.notifyBeforeExpiry ? 'left-[22px]' : 'left-[3px]'}`} />
            </div>
          </button>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1 animate-slide-up" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center gap-3 p-4 bg-tg-secondary rounded-2xl active:opacity-80 transition-all hover:shadow-card hover:-translate-y-0.5"
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
