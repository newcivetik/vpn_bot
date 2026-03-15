import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, PlanDTO, SubscriptionDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { PlanCard } from '../components/PlanCard';
import { ConnectionKey } from '../components/ConnectionKey';
import { UsageBar } from '../components/UsageBar';

export function HomePage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription, setSubscription } = useUserStore();
  const { initData, haptic } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.getPlans(),
      initData ? api.getSubscription(initData) : Promise.resolve(null),
    ])
      .then(([plans, sub]) => {
        setPlans(plans);
        setSubscription(sub);
      })
      .finally(() => setLoading(false));
  }, [initData, setSubscription]);

  const handleSelectPlan = (plan: PlanDTO) => {
    haptic?.selectionChanged();
    navigate(`/payment/${plan.id}`);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-tg-secondary rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-6">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="text-4xl mb-2">🔒</div>
        <h1 className="text-xl font-bold text-tg-text">VPN-сервис</h1>
        <p className="text-sm text-tg-hint">
          Быстрый и безопасный VLESS+Reality
        </p>
      </div>

      {/* Active subscription */}
      {subscription && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-600">
                Активна
              </span>
            </div>
            <div className="text-sm text-tg-hint">
              Тариф: {subscription.plan.name} — до{' '}
              {new Date(subscription.expiresAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
              })}
            </div>
          </div>

          <UsageBar
            usedGB={subscription.trafficUsedGB}
            limitGB={subscription.plan.trafficLimitGB}
          />

          <ConnectionKey connectionLink={subscription.connectionLink} />
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-bold text-tg-text mb-3">
          {subscription ? 'Продлить или сменить тариф' : 'Выберите тариф'}
        </h2>
        <div className="space-y-3">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSelect={handleSelectPlan}
              popular={i === 1}
            />
          ))}
        </div>
      </div>

      {/* Help link */}
      <button
        onClick={() => navigate('/help')}
        className="w-full py-3 text-tg-link text-sm"
      >
        Как подключиться?
      </button>
    </div>
  );
}
