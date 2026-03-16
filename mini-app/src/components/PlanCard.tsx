import type { PlanDTO } from '../api/client';

interface Props {
  plan: PlanDTO;
  onSelect: (plan: PlanDTO) => void;
  popular?: boolean;
}

export function PlanCard({ plan, onSelect, popular }: Props) {
  const trafficLabel =
    plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : 'Безлимит';

  return (
    <div
      className={`relative rounded-2xl p-5 border-2 transition-all ${
        popular
          ? 'border-tg-button bg-tg-button/5 shadow-lg'
          : 'border-tg-secondary bg-tg-secondary'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tg-button text-tg-button-text text-xs font-bold px-3 py-1 rounded-full">
          Популярный
        </span>
      )}

      <h3 className="text-lg font-bold text-tg-text mb-1">{plan.name}</h3>

      <div className="text-3xl font-bold text-tg-text mb-2">
        {plan.price} ₽
        <span className="text-sm font-normal text-tg-hint">/мес</span>
      </div>

      <div className="space-y-1.5 text-sm text-tg-hint mb-4">
        <div>📊 Трафик: {trafficLabel}</div>
        <div>📱 Устройств: {plan.maxDevices}</div>
        <div>📅 {plan.durationDays} дней</div>
      </div>

      <button
        onClick={() => onSelect(plan)}
        className="w-full py-3 rounded-xl font-semibold text-tg-button-text bg-tg-button active:opacity-80 transition-opacity"
      >
        Выбрать
      </button>
    </div>
  );
}
