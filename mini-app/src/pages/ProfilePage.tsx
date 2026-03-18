import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Activity, HelpCircle, ChevronRight, Users, Copy, Gift, Award, History, Bell, BellOff } from 'lucide-react';
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
      {/* Profile Card */}
      <div
        className="bg-gradient-to-br from-[#F0E4FA] to-[#D0EAFF] rounded-[32px] p-8 text-center shadow-[0_8px_32px_rgba(100,60,120,0.10)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
        style={{ animationDelay: '0ms' }}
      >
        <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] flex items-center justify-center mx-auto mb-4 shadow-[0_6px_24px_rgba(160,130,210,0.3)]">
          <span className="text-[42px]">🦊</span>
        </div>
        <h1 className="text-2xl font-black text-[#3D2C4E]">{firstName || 'Пользователь'}</h1>
        <p className="text-sm font-semibold text-[#6B5A7A] mt-1">
          {subscription ? `Тариф: ${subscription.plan.name}` : 'Нет активной подписки'}
        </p>
        {subscription && (
          <div className="inline-block bg-white/50 px-4 py-1.5 rounded-2xl text-xs font-extrabold text-[#3D2C4E] mt-3">
            {subscription.plan.name}
          </div>
        )}
      </div>

      {/* Profile completeness */}
      {!subscription && (
        <div
          className="bg-gradient-to-br from-[#E8D5F5]/20 to-[#BDE0FE]/20 rounded-3xl p-4 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-extrabold text-[#3D2C4E]">Профиль</span>
            <span className="text-xs font-bold text-[#C9A0F0]">1 из 3</span>
          </div>
          <div className="h-1.5 bg-[#E8D5F5]/30 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-[#C9A0F0] to-[#89B8F8] rounded-full" />
          </div>
          <p className="text-xs text-[#6B5A7A] mt-2">Подключи VPN и активируй реферальную программу</p>
        </div>
      )}

      {/* Subscription info */}
      {subscription && (
        <div
          className="bg-white rounded-3xl p-5 space-y-3 shadow-[0_4px_20px_rgba(100,60,120,0.08)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '100ms' }}
        >
          <h2 className="text-sm font-extrabold text-[#3D2C4E]">Подписка</h2>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8D5F5]/30 flex items-center justify-center">
              <Calendar size={18} className="text-[#C9A0F0]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[#3D2C4E]">{daysLeft} дн. осталось</div>
              <div className="text-xs text-[#6B5A7A]">
                до {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#BDE0FE]/30 flex items-center justify-center">
              <Activity size={18} className="text-[#89B8F8]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[#3D2C4E]">Трафик: {trafficLabel}</div>
              <div className="text-xs text-[#6B5A7A]">
                {subscription.plan.trafficLimitGB > 0 ? 'Лимитированный' : 'Безлимитный'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral card */}
      {profile && (
        <div
          className="bg-gradient-to-br from-[#E8D5F5]/20 to-[#BDE0FE]/20 rounded-3xl p-5 space-y-3 shadow-[0_4px_20px_rgba(100,60,120,0.08)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#C9A0F0]" />
            <h2 className="text-sm font-extrabold text-[#3D2C4E]">Реферальная программа</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#9B8AAB]">Приглашено:</span>
                <span className="font-bold text-[#3D2C4E]">{profile.referralCount}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[#9B8AAB]">Бонус дней:</span>
                <span className="font-bold text-[#3D2C4E]">{profile.referralBonusDays}</span>
              </div>
            </div>
            <Gift size={32} className="text-[#E8D5F5]" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopyReferral}
              aria-label="Копировать реферальную ссылку"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-[#E8D5F5]/40 active:scale-95 transition-transform"
            >
              <Copy size={14} className="text-[#C9A0F0]" />
              <span className="text-xs font-medium text-[#3D2C4E]">Копировать</span>
            </button>
            <button
              onClick={handleShare}
              aria-label="Поделиться реферальной ссылкой"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] active:scale-95 transition-transform"
            >
              <Users size={14} className="text-white" />
              <span className="text-xs font-medium text-white">Поделиться</span>
            </button>
          </div>
        </div>
      )}

      {/* Loyalty card */}
      {profile?.isReturning && (
        <div
          className="bg-gradient-to-br from-[#FFF8EE] to-[#FFE8CC] rounded-3xl p-5 space-y-2 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[#FFAA80]" />
            <h2 className="text-sm font-extrabold text-[#3D2C4E]">Лояльность</h2>
          </div>
          <div className="text-sm text-[#6B5A7A]">
            Всего подписок: <span className="font-bold text-[#3D2C4E]">{profile.totalSubscriptions}</span>
          </div>
          <div className="text-xs text-[#6B5A7A]">
            Используй промокод <span className="font-bold text-[#FFAA80]">RENEW15</span> для скидки 15% при продлении
          </div>
        </div>
      )}

      {/* Subscription history */}
      {history.length > 1 && (
        <div
          className="bg-white rounded-3xl p-5 space-y-3 shadow-[0_4px_20px_rgba(100,60,120,0.08)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#9B8AAB]" />
            <h2 className="text-sm font-extrabold text-[#3D2C4E]">История подписок</h2>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((sub) => {
              const isActive = sub.status === 'active';
              return (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-[#9B8AAB]'}`} />
                    <span className="text-[#3D2C4E]">{sub.plan.name}</span>
                  </div>
                  <span className="text-xs text-[#9B8AAB]">
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
        <div
          className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(100,60,120,0.08)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '500ms' }}
        >
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
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${profile.notifyBeforeExpiry ? 'bg-[#E8D5F5]/30' : 'bg-[#DDD]/30'}`}>
              {profile.notifyBeforeExpiry ? <Bell size={18} className="text-[#C9A0F0]" /> : <BellOff size={18} className="text-[#9B8AAB]" />}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-[#3D2C4E]">Уведомления</div>
              <div className="text-xs text-[#6B5A7A]">Напоминание об окончании подписки</div>
            </div>
            <div className={`w-11 h-[26px] rounded-full transition-all duration-300 relative ${profile.notifyBeforeExpiry ? 'bg-gradient-to-r from-[#C9A0F0] to-[#89B8F8]' : 'bg-[#DDD]'}`}>
              <div
                className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm ${profile.notifyBeforeExpiry ? 'left-[22px]' : 'left-[3px]'}`}
                style={{ transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Help menu */}
      <div
        className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
        style={{ animationDelay: '600ms' }}
      >
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-3xl shadow-[0_4px_20px_rgba(100,60,120,0.08)] active:opacity-80 transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#C1F0DB]/30 flex items-center justify-center">
            <HelpCircle size={18} className="text-green-500" />
          </div>
          <span className="flex-1 text-sm font-medium text-[#3D2C4E] text-left">Как подключиться</span>
          <ChevronRight size={18} className="text-[#9B8AAB]" />
        </button>
      </div>
    </div>
  );
}
