import { useEffect, useState } from 'react';
import { Check, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  message: string;
  type: ToastType;
}

let showToastFn: ((data: ToastData) => void) | null = null;

export function toast(message: string, type: ToastType = 'success') {
  showToastFn?.({ message, type });
}

const ICONS = {
  success: Check,
  error: X,
  info: Info,
};

const COLORS = {
  success: 'bg-brand-green',
  error: 'bg-brand-red',
  info: 'bg-brand-blue',
};

export function ToastContainer() {
  const [data, setData] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    showToastFn = (d) => {
      setData(d);
      setVisible(true);
      setExiting(false);
    };
    return () => { showToastFn = null; };
  }, []);

  useEffect(() => {
    if (!visible || exiting) return;
    let exitTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      setExiting(true);
      exitTimer = setTimeout(() => { setVisible(false); setExiting(false); }, 300);
    }, 2000);
    return () => { clearTimeout(timer); clearTimeout(exitTimer); };
  }, [visible, exiting]);

  if (!data || !visible) return null;

  const Icon = ICONS[data.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
        exiting ? 'opacity-0 -translate-y-2' : 'opacity-100 animate-slide-up'
      }`}
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white shadow-lg ${COLORS[data.type]}`}>
        <Icon size={16} />
        <span className="text-sm font-medium">{data.message}</span>
      </div>
    </div>
  );
}
