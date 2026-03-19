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
  const [personalDiscount, setPersonalDiscount] = useState<{
    discountPercent: number;
    bonusDays: number;
    reason?: string;
    expiresAt?: string;
  } | null>(null);
  const { subscription } = useUserStore();
  const { haptic, initData } = useTelegram();
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
    if (initData) {
      api.getPersonalDiscount(initData)
        .then((d) => setPersonalDiscount(d))
        .catch(() => {});
    }
  }, [initData]);

  const handleSelect = (plan: PlanDTO) => {
    haptic?.selectionChanged();
    navigate(`/plans/${plan.id}/pay`);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-[#E8D5F5]/20 rounded-xl animate-pulse" />
        <div className="h-5 w-36 bg-[#E8D5F5]/20 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-52 bg-[#E8D5F5]/20 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-[#FFB6C1]/15 rounded-3xl p-5 flex items-center gap-3">
          <AlertTriangle size={20} className="text-[#E57585] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#3D2C4E]">{error}</p>
            <button
              onClick={loadPlans}
              className="text-xs text-white mt-2 px-4 py-2.5 rounded-[50px] bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] font-extrabold"
            >
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
        <h1 className="text-2xl font-black text-[#3D2C4E]">Тарифные планы 💎</h1>
        <p className="text-sm font-semibold text-[#9B8AAB] mt-1">
          {subscription ? 'Продли или смени тариф' : 'Выбери подходящий план'}
        </p>
      </div>

      {personalDiscount && personalDiscount.discountPercent > 0 && (
        <div className="bg-gradient-to-r from-[#C1F0DB] to-[#A8E6CF] rounded-3xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎁</span>
            <span className="font-bold text-[#2D8B5E] text-sm">Персональная скидка {personalDiscount.discountPercent}%</span>
          </div>
          {personalDiscount.reason && (
            <div className="text-xs text-[#2D8B5E]/80">{personalDiscount.reason}</div>
          )}
          {personalDiscount.expiresAt && (
            <div className="text-xs text-[#2D8B5E]/60 mt-1">
              До {new Date(personalDiscount.expiresAt).toLocaleDateString('ru-RU')}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
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
                  personalDiscount={personalDiscount?.discountPercent}
                />
              </div>
            );
          });
        })()}
      </div>

    </div>
  );
}
