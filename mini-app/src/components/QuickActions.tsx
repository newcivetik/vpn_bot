import { useNavigate } from 'react-router-dom';
import { Copy, QrCode, ShoppingBag, Globe, MessageCircle } from 'lucide-react';
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
      bg: 'bg-gradient-to-br from-[#F0E4FA] to-[#E8D5F5]',
      iconColor: 'text-[#9B7DB8]',
      onClick: handleCopy,
      disabled: !connectionLink,
    },
    {
      icon: QrCode,
      label: 'QR-код',
      bg: 'bg-gradient-to-br from-[#D0EAFF] to-[#BDE0FE]',
      iconColor: 'text-[#5B9BD5]',
      onClick: onShowQR,
      disabled: !connectionLink,
    },
    {
      icon: ShoppingBag,
      label: 'Тарифы',
      bg: 'bg-gradient-to-br from-[#FFE8D4] to-[#FFD4B8]',
      iconColor: 'text-[#D4895A]',
      onClick: () => navigate('/plans'),
    },
    {
      icon: Globe,
      label: 'Серверы',
      bg: 'bg-gradient-to-br from-[#D4F7E8] to-[#C1F0DB]',
      iconColor: 'text-[#5BAF8B]',
      onClick: () => navigate('/servers'),
    },
    {
      icon: MessageCircle,
      label: 'Поддержка',
      bg: 'bg-gradient-to-br from-[#E4E8FA] to-[#D5DAFA]',
      iconColor: 'text-[#7B82B8]',
      onClick: () => navigate('/support'),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 animate-slide-up">
      {actions.map(({ icon: Icon, label, bg, iconColor, onClick, disabled }, i) => (
        <div key={label} className="animate-scale-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
          <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`w-full flex flex-col items-center gap-1.5 p-4 rounded-[20px] ${bg} shadow-[0_4px_20px_rgba(100,60,120,0.08)] active:scale-[0.92] transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_8px_32px_rgba(100,60,120,0.12)] ${
              disabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center`}>
              <Icon size={20} className={iconColor} />
            </div>
            <span className="text-xs font-bold text-[#3D2C4E]">{label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
