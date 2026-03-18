import { Check } from 'lucide-react';
import type { PlanDTO } from '../api/client';

interface Props {
  plan: PlanDTO;
  onSelect: (plan: PlanDTO) => void;
  popular?: boolean;
  current?: boolean;
  savingsPct?: number;
}

export function PlanCard({ plan, onSelect, popular, current, savingsPct }: Props) {
  const trafficLabel =
    plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ трафика` : 'Безлимитный трафик';

  const pricePerDay = (plan.price / plan.durationDays).toFixed(1);

  const features = [
    trafficLabel,
    `${plan.maxDevices} устройств`,
    `${plan.durationDays} дней`,
    'VLESS+Reality',
  ];

  return (
    <div
      className={`relative rounded-3xl p-5 border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        popular
          ? 'border-brand-purple bg-brand-purple/5 shadow-glow'
          : current
            ? 'border-brand-green bg-brand-green/5'
            : 'border-transparent bg-tg-secondary'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-xs font-bold px-4 py-1 rounded-full shadow-glow-purple">
          Популярный
        </span>
      )}
      {current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-green text-white text-xs font-bold px-4 py-1 rounded-full">
          Текущий
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-tg-text">{plan.name}</h3>
          <div className="text-2xl font-bold text-tg-text mt-1">
            {plan.price} ₽
            <span className="text-sm font-normal text-tg-hint"> / {plan.durationDays} дн.</span>
          </div>
          <div className="text-xs text-tg-hint mt-0.5">{pricePerDay} ₽/день</div>
        </div>
        {!!savingsPct && savingsPct > 0 && (
          <span className="text-xs font-bold text-brand-green bg-brand-green/10 px-2.5 py-1 rounded-full animate-scale-in">
            -{savingsPct}%
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-tg-hint">
            <Check size={14} className="text-brand-green flex-shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan)}
        className={`w-full py-3 rounded-xl font-semibold active:scale-95 transition-all duration-200 ${
          popular
            ? 'bg-gradient-primary text-white hover:shadow-glow-purple'
            : 'bg-tg-button text-tg-button-text hover:opacity-90'
        }`}
      >
        {current ? 'Продлить' : 'Выбрать'}
      </button>
    </div>
  );
}
