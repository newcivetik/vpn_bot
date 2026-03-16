const colorMap: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-purple-100 text-purple-700',
  stars: 'bg-amber-100 text-amber-700',
  yokassa: 'bg-blue-100 text-blue-700',
};

export function StatusBadge({ status }: { status: string }) {
  const classes = colorMap[status] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status}
    </span>
  );
}
