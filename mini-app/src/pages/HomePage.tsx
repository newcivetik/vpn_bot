import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { StatusCard } from '../components/StatusCard';
import { QuickStats } from '../components/QuickStats';
import { QuickActions } from '../components/QuickActions';
import { QRModal } from '../components/QRModal';
import { Zap, AlertTriangle, Shield, Globe, Wifi, RefreshCw } from 'lucide-react';

export function HomePage() {
  const { subscription, setSubscription, firstName, setFirstName } = useUserStore();
  const { initData, tg } = useTelegram();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = tg?.initDataUnsafe?.user;
    if (user?.first_name) {
      setFirstName(user.first_name);
    }

    if (initData) {
      api
        .getSubscription(initData)
        .then(setSubscription)
        .catch((e) => {
          console.error('Failed to load subscription:', e);
          // For auth errors (new users, expired initData) — show normal screen without subscription
          setSubscription(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [initData, setSubscription, setFirstName, tg]);

  const handleRefresh = async () => {
    if (!initData || refreshing) return;
    setRefreshing(true);
    try {
      const sub = await api.getSubscription(initData);
      setSubscription(sub);
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="h-28 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-[#FFB6C1]/15 border border-[#FFB6C1]/30 rounded-3xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-[#E8899A] shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#3D2C4E]">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                api.getSubscription(initData)
                  .then(setSubscription)
                  .catch((e) => {
                    console.error('Retry failed:', e);
                    setError('Не удалось загрузить подписку');
                  })
                  .finally(() => setLoading(false));
              }}
              className="text-xs mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#C9A0F0] to-[#89B8F8] text-white font-semibold"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-4 space-y-4">
      {/* Greeting */}
      <div
        className="flex items-start justify-between animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          <h1 className="text-2xl font-black text-[#3D2C4E] tracking-tight">
            Привет{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-sm font-semibold text-[#9B8AAB] mt-0.5">Твой VPN работает отлично</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Обновить"
          className="p-3 rounded-full bg-[#E8D5F5]/30 hover:bg-[#E8D5F5]/50 active:scale-90 transition-all"
        >
          <RefreshCw size={18} className={`text-[#9B8AAB] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status card */}
      <div
        className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
        style={{ animationDelay: '60ms' }}
      >
        <StatusCard subscription={subscription} />
      </div>

      {/* Quick stats (only if subscribed) */}
      {subscription && (
        <div
          className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '180ms' }}
        >
          <QuickStats subscription={subscription} />
        </div>
      )}

      {/* Quick actions */}
      <div
        className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
        style={{ animationDelay: '240ms' }}
      >
        <QuickActions
          connectionLink={subscription?.connectionLink}
          onShowQR={() => setShowQR(true)}
        />
      </div>

      {/* Connection tips for active users */}
      {subscription && (
        <div
          className="bg-gradient-to-br from-[#FFF8EE] to-[#FFE8CC] rounded-3xl p-4 space-y-3 shadow-[0_8px_32px_rgba(100,60,120,0.10)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
          style={{ animationDelay: '300ms' }}
        >
          <h3 className="text-sm font-bold text-[#3D2C4E]">Советы</h3>
          <div className="space-y-2">
            {[
              { icon: Shield, color: 'text-[#9B6DC6]', text: 'VLESS+Reality невидим для провайдера' },
              { icon: Globe, color: 'text-[#89B8F8]', text: 'Работает во всех приложениях и браузерах' },
              { icon: Wifi, color: 'text-[#7ECBA1]', text: 'Авто-подключение при потере сети' },
            ].map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-3 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
                style={{ animationDelay: `${360 + i * 80}ms` }}
              >
                <tip.icon size={16} className={tip.color} />
                <span className="text-xs text-[#6B4A8A]">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promo card when no subscription */}
      {!subscription && (
        <>
          {/* Social proof */}
          <div
            className="flex items-center justify-center gap-4 py-3 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
            style={{ animationDelay: '300ms' }}
          >
            <div className="text-center bg-[#E8D5F5]/20 rounded-2xl px-4 py-2">
              <div className="text-lg font-bold text-[#3D2C4E]">1,500+</div>
              <div className="text-[10px] text-[#9B8AAB]">пользователей</div>
            </div>
            <div className="text-center bg-[#D5E8F5]/20 rounded-2xl px-4 py-2">
              <div className="text-lg font-bold text-[#3D2C4E]">99.9%</div>
              <div className="text-[10px] text-[#9B8AAB]">uptime</div>
            </div>
            <div className="text-center bg-[#D5F5E8]/20 rounded-2xl px-4 py-2">
              <div className="text-lg font-bold text-[#3D2C4E]">10+</div>
              <div className="text-[10px] text-[#9B8AAB]">серверов</div>
            </div>
          </div>

          {/* Promo card */}
          <div
            className="bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] rounded-3xl p-5 text-white shadow-[0_6px_24px_rgba(160,130,210,0.3)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
            style={{ animationDelay: '360ms' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap size={24} />
              <span className="font-bold text-lg">Начни прямо сейчас</span>
            </div>
            <p className="text-sm text-white/80 mb-4">
              Безопасный интернет за пару минут. VLESS+Reality — невидим для провайдера.
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="w-full py-3 rounded-xl bg-white text-[#6B4A8A] font-bold active:scale-95 transition-all hover:shadow-lg hover:shadow-white/20"
            >
              Выбрать тариф
            </button>
          </div>
        </>
      )}

      {/* QR Modal */}
      {showQR && subscription?.connectionLink && (
        <QRModal
          connectionLink={subscription.connectionLink}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}
