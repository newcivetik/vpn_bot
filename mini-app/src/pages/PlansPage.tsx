import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PlanDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { PlanCard } from '../components/PlanCard';
import { AlertTriangle } from 'lucide-react';

export function PlansPage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscription } = useUserStore();
  const { haptic } = useTelegram();
  const navigate = useNavigate();

  const loadPlans = () => {
    setError(null);
    setLoading(true);
    api
      .getPlans()
      .then(setPlans)
      .catch((e) => {
        console.error('Failed to load plans:', e);
        setError('Не удалось загрузить тарифы');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSelect = (plan: PlanDTO) => {
    haptic?.selectionChanged();
    navigate(`/plans/${plan.id}/pay`);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-40 bg-tg-secondary rounded-xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 bg-tg-secondary rounded-3xl animate-pulse" />
        ))}
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
            <button onClick={loadPlans} className="text-xs text-tg-link mt-2 px-4 py-2.5 rounded-lg bg-tg-link/10 font-medium">
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate best price per day for savings comparison
  const pricesPerDay = plans.map((p) => p.price / p.durationDays);
  const maxPricePerDay = Math.max(...pricesPerDay);

  return (
    <div className="p-4 pb-4 space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">Тарифы</h1>
        <p className="text-sm text-tg-hint">
          {subscription ? 'Продли или смени тариф' : 'Выбери свой тариф'}
        </p>
      </div>

      <div className="space-y-3">
        {(() => {
          const sortedPlans = [...plans].sort((a, b) => b.price - a.price);
          const bestValueIdx = sortedPlans.reduce((best, plan, idx) => {
            const ppd = plan.price / plan.durationDays;
            const bestPpd = sortedPlans[best].price / sortedPlans[best].durationDays;
            return ppd < bestPpd ? idx : best;
          }, 0);

          return sortedPlans.map((plan, i) => {
            const pricePerDay = plan.price / plan.durationDays;
            const savingsPct = maxPricePerDay > pricePerDay
              ? Math.round((1 - pricePerDay / maxPricePerDay) * 100)
              : 0;

            return (
              <div
                key={plan.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
              >
                <PlanCard
                  plan={plan}
                  onSelect={handleSelect}
                  popular={i === bestValueIdx}
                  current={subscription?.plan.id === plan.id}
                  savingsPct={savingsPct}
                />
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
