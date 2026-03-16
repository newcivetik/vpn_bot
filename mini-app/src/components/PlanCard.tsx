import { Check } from 'lucide-react';
import type { PlanDTO } from '../api/client';

interface Props {
  plan: PlanDTO;
  onSelect: (plan: PlanDTO) => void;
  popular?: boolean;
  current?: boolean;
}

export function PlanCard({ plan, onSelect, popular, current }: Props) {
  const trafficLabel =
    plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ трафика` : 'Безлимитный трафик';

  const features = [
    trafficLabel,
    `${plan.maxDevices} устройств`,
    `${plan.durationDays} дней`,
    'VLESS+Reality',
  ];

  return (
    <div
      className={`relative rounded-3xl p-5 border-2 transition-all ${
        popular
          ? 'border-brand-purple bg-brand-purple/5 shadow-glow'
          : current
            ? 'border-brand-green bg-brand-green/5'
            : 'border-transparent bg-tg-secondary'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-white text-xs font-bold px-4 py-1 rounded-full">
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
          {current && plan.renewalDiscountPercent ? (
            <div className="mt-1">
              <span className="text-sm text-tg-hint line-through">{plan.price} ₽</span>
              <div className="text-2xl font-bold text-brand-green">
                {Math.round(plan.price * (1 - plan.renewalDiscountPercent / 100))} ₽
                <span className="text-sm font-normal text-tg-hint"> / мес</span>
                <span className="ml-2 text-xs font-medium bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-full">
                  -{plan.renewalDiscountPercent}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold text-tg-text mt-1">
              {plan.price} ₽
              <span className="text-sm font-normal text-tg-hint"> / мес</span>
            </div>
          )}
        </div>
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
        className={`w-full py-3 rounded-xl font-semibold active:scale-95 transition-transform ${
          popular
            ? 'bg-gradient-primary text-white'
            : 'bg-tg-button text-tg-button-text'
        }`}
      >
        {current ? 'Продлить' : 'Выбрать'}
      </button>
    </div>
  );
}
