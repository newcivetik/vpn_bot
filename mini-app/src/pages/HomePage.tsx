import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { StatusCard } from '../components/StatusCard';
import { QuickStats } from '../components/QuickStats';
import { QuickActions } from '../components/QuickActions';
import { QRModal } from '../components/QRModal';
import { Zap, AlertTriangle } from 'lucide-react';

export function HomePage() {
  const { subscription, setSubscription, firstName, setFirstName } = useUserStore();
  const { initData, tg } = useTelegram();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
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
          setError('Не удалось загрузить подписку');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [initData, setSubscription, setFirstName, tg]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-tg-secondary rounded-xl animate-pulse" />
        <div className="h-28 bg-tg-secondary rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-tg-secondary rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-brand-red/10 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-brand-red shrink-0" />
          <div>
            <p className="text-sm font-medium text-tg-text">{error}</p>
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
              className="text-xs text-tg-link mt-1"
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
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">
          Привет{firstName ? `, ${firstName}` : ''}! 👋
        </h1>
        <p className="text-sm text-tg-hint">Твой VPN-щит</p>
      </div>

      {/* Status card */}
      <StatusCard subscription={subscription} />

      {/* Quick stats (only if subscribed) */}
      {subscription && <QuickStats subscription={subscription} />}

      {/* Quick actions */}
      <QuickActions
        connectionLink={subscription?.connectionLink}
        onShowQR={() => setShowQR(true)}
      />

      {/* Promo card when no subscription */}
      {!subscription && (
        <div className="bg-gradient-primary rounded-3xl p-5 text-white animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={24} />
            <span className="font-bold text-lg">Начни прямо сейчас</span>
          </div>
          <p className="text-sm text-white/80 mb-4">
            Безопасный интернет за пару минут. VLESS+Reality — невидим для провайдера.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className="w-full py-3 rounded-xl bg-white text-brand-purple font-bold active:scale-95 transition-transform"
          >
            Выбрать тариф
          </button>
        </div>
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
