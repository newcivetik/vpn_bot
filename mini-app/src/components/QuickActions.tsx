import { useNavigate } from 'react-router-dom';
import { Copy, QrCode, ShoppingBag, HelpCircle } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

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
    } catch {
      const input = document.createElement('textarea');
      input.value = connectionLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      haptic?.notificationOccurred('success');
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
      icon: HelpCircle,
      label: 'Помощь',
      color: 'from-brand-green to-teal-500',
      onClick: () => navigate('/help'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 animate-slide-up">
      {actions.map(({ icon: Icon, label, color, onClick, disabled }) => (
        <button
          key={label}
          onClick={onClick}
          disabled={disabled}
          className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-tg-secondary active:scale-95 transition-transform ${
            disabled ? 'opacity-40' : ''
          }`}
        >
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon size={20} className="text-white" />
          </div>
          <span className="text-xs font-medium text-tg-text">{label}</span>
        </button>
      ))}
    </div>
  );
}
