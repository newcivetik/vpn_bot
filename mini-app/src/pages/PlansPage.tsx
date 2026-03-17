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
            <button onClick={loadPlans} className="text-xs text-tg-link mt-1">
              Попробовать снова
            </button>
          </div>
        </div>
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
