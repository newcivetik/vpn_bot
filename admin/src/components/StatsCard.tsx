import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
}

export function StatsCard({ title, value, icon: Icon, color = 'text-blue-600', trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 animate-fade-in">
      <div className={`w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{title}</div>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trend.value >= 0 ? '+' : ''}{trend.value}</span>
            <span className="text-slate-400">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
