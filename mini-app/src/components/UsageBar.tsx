interface Props {
  usedGB: number;
  limitGB: number;
}

export function UsageBar({ usedGB, limitGB }: Props) {
  const isUnlimited = limitGB === 0;
  const percentage = isUnlimited ? 0 : Math.min((usedGB / limitGB) * 100, 100);

  return (
    <div className="bg-tg-secondary rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-tg-hint">Трафик</span>
        <span className="text-sm font-semibold text-tg-text">
          {usedGB.toFixed(1)} ГБ
          {isUnlimited ? ' (безлимит)' : ` / ${limitGB} ГБ`}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-2 bg-tg-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage > 90
                ? 'bg-red-500'
                : percentage > 70
                  ? 'bg-yellow-500'
                  : 'bg-tg-button'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
