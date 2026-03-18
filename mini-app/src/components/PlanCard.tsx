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

  /* Anchor price: show a fake "original" price that's ~30% higher when there are savings */
  const anchorPrice = savingsPct && savingsPct > 0
    ? Math.round(plan.price / (1 - savingsPct / 100))
    : null;

  const cardBg = current
    ? 'bg-gradient-to-br from-[#D4F7E8] to-[#C1F0DB]'
    : popular
      ? 'bg-white'
      : 'bg-gradient-to-br from-[#D0EAFF] to-[#BDE0FE]';

  const badgeColors = current
    ? 'bg-[#D4F7E8] text-[#2D8B5E]'
    : popular
      ? 'bg-[#EDE0F7] text-[#7B5EA7]'
      : 'bg-[#BDE0FE] text-[#3B7BBF]';

  return (
    <div className="relative">
      {/* Gradient border wrapper for popular card */}
      {popular && (
        <div className="absolute -inset-[2px] rounded-[26px] bg-gradient-to-br from-[#C9A0F0] via-[#89B8F8] to-[#FFB6C1] opacity-60 blur-[1px]" />
      )}

      <div
        onClick={() => onSelect(plan)}
        className={`relative rounded-3xl p-6 shadow-[0_8px_32px_rgba(100,60,120,0.10)] transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(100,60,120,0.15)] active:scale-[0.97] ${cardBg}`}
      >
        {/* Popular badge — top right dropdown shape */}
        {popular && (
          <div className="absolute top-0 right-5">
            <span className="bg-gradient-to-br from-[#FFD4B8] to-[#FFB6C1] text-white text-xs font-extrabold px-4 py-1.5 rounded-b-xl inline-block">
              ✨ Популярный
            </span>
          </div>
        )}

        {/* Current badge — top right */}
        {current && (
          <div className="absolute top-0 right-5">
            <span className="bg-gradient-to-br from-[#7DD4A8] to-[#5CC0C0] text-white text-xs font-extrabold px-4 py-1.5 rounded-b-xl inline-block">
              Текущий
            </span>
          </div>
        )}

        {/* Plan tier badge */}
        <span className={`inline-block px-3 py-1 rounded-2xl text-xs font-extrabold uppercase tracking-wide mb-3 ${badgeColors}`}>
          {plan.name}
        </span>

        {/* Plan name */}
        <h3 className="text-2xl font-black text-[#3D2C4E] mb-1">{plan.name}</h3>

        {/* Price block */}
        <div className="mb-1">
          <div className="flex items-baseline">
            {anchorPrice && (
              <span className="text-base font-bold text-[#9B8AAB] line-through mr-2">
                {anchorPrice} ₽
              </span>
            )}
            <span className="text-3xl font-black text-[#3D2C4E]">{plan.price} ₽</span>
          </div>
          <div className="text-xs font-semibold text-[#6B5A7A] mt-0.5">{pricePerDay} ₽/день</div>
        </div>

        {/* Period + savings */}
        <div className="text-sm font-semibold text-[#6B5A7A] mb-4">
          {plan.durationDays} дней
          {!!savingsPct && savingsPct > 0 && (
            <span className="text-[#2D8B5E] font-extrabold ml-2">экономия {savingsPct}%</span>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2 mb-5">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-[#6B5A7A]">
              <span className="text-[#7DD4A8] font-bold flex-shrink-0">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Select button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(plan);
          }}
          className={`w-full py-3.5 font-extrabold transition-all duration-200 active:scale-95 ${
            current
              ? 'bg-gradient-to-br from-[#7DD4A8] to-[#5CC0C0] text-white rounded-[50px]'
              : popular
                ? 'bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white rounded-[50px] shadow-[0_6px_24px_rgba(160,130,210,0.3)]'
                : 'border-2 border-[#E8D5F5] text-[#3D2C4E] rounded-[50px]'
          }`}
        >
          {current ? 'Продлить' : 'Выбрать'}
        </button>
      </div>
    </div>
  );
}
