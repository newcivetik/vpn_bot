import { useNavigate } from 'react-router-dom';
import { Copy, QrCode, ShoppingBag, Globe } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { toast } from './Toast';

interface Props {
  connectionLink?: string;
  onShowQR?: () => void;
}

export function QuickActions({ connectionLink, onShowQR }: Props) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const handleCopy = async () => {
    if (!connectionLink) return;
    try {
      await navigator.clipboard.writeText(connectionLink);
      haptic?.notificationOccurred('success');
      toast('Ключ скопирован');
    } catch {
      const input = document.createElement('textarea');
      input.value = connectionLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      haptic?.notificationOccurred('success');
      toast('Ключ скопирован');
    }
  };

  const actions = [
    {
      icon: Copy,
      label: 'Копировать ключ',
      color: 'from-brand-purple to-brand-blue',
      onClick: handleCopy,
      disabled: !connectionLink,
    },
    {
      icon: QrCode,
      label: 'QR-код',
      color: 'from-brand-blue to-cyan-500',
      onClick: onShowQR,
      disabled: !connectionLink,
    },
    {
      icon: ShoppingBag,
      label: 'Тарифы',
      color: 'from-brand-orange to-brand-pink',
      onClick: () => navigate('/plans'),
    },
    {
      icon: Globe,
      label: 'Серверы',
      color: 'from-brand-green to-teal-500',
      onClick: () => navigate('/servers'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 animate-slide-up">
      {actions.map(({ icon: Icon, label, color, onClick, disabled }, i) => (
        <div key={label} className="animate-scale-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
          <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`w-full flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-tg-secondary active:scale-95 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 ${
              disabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
              <Icon size={20} className="text-white" />
            </div>
            <span className="text-xs font-medium text-tg-text">{label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
