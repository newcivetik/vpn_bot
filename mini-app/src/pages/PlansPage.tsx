import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PlanDTO } from '../api/client';
import { useTelegram } from '../hooks/useTelegram';
import { useUserStore } from '../stores/userStore';
import { PlanCard } from '../components/PlanCard';

export function PlansPage() {
  const [plans, setPlans] = useState<PlanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription } = useUserStore();
  const { haptic } = useTelegram();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getPlans()
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
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

  return (
    <div className="p-4 pb-4 space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">Тарифы</h1>
        <p className="text-sm text-tg-hint">
          {subscription ? 'Продли или смени тариф' : 'Выбери свой тариф'}
        </p>
      </div>

      <div className="space-y-3 animate-slide-up">
        {plans.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelect}
            popular={i === 1}
            current={subscription?.plan.id === plan.id}
          />
        ))}
      </div>
    </div>
  );
}
