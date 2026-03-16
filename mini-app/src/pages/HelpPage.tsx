import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { ShoppingCart, Key, Smartphone, Plus, Rocket } from 'lucide-react';

const STEPS = [
  {
    icon: ShoppingCart,
    title: 'Купите подписку',
    text: 'Выберите тариф и оплатите через Stars или карту',
    color: 'from-brand-purple to-brand-blue',
  },
  {
    icon: Key,
    title: 'Скопируйте ключ',
    text: 'Нажмите «Копировать ключ» на главной или в боте (/key)',
    color: 'from-brand-blue to-cyan-500',
  },
  {
    icon: Smartphone,
    title: 'Скачайте Hiddify',
    text: 'iPhone: App Store, Android: Google Play, Windows/Mac: hiddify.com',
    color: 'from-brand-orange to-brand-pink',
  },
  {
    icon: Plus,
    title: 'Добавьте ключ',
    text: 'Откройте Hiddify → нажмите + → вставьте ключ',
    color: 'from-brand-pink to-brand-red',
  },
  {
    icon: Rocket,
    title: 'Подключайтесь',
    text: 'Нажмите кнопку подключения — готово!',
    color: 'from-brand-green to-teal-500',
  },
];

export function HelpPage() {
  const navigate = useNavigate();
  const { backButton } = useTelegram();

  useEffect(() => {
    backButton?.show();
    const goBack = () => navigate(-1);
    backButton?.onClick(goBack);
    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
    };
  }, [navigate, backButton]);

  return (
    <div className="p-4 pb-4 space-y-4">
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">Как подключиться</h1>
        <p className="text-sm text-tg-hint">5 простых шагов</p>
      </div>

      <div className="space-y-3 animate-slide-up">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-4 bg-tg-secondary rounded-2xl p-4"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <div className="font-semibold text-tg-text text-sm">
                  {i + 1}. {step.title}
                </div>
                <div className="text-sm text-tg-hint mt-0.5">{step.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-brand-purple/10 rounded-2xl p-4 animate-slide-up">
        <div className="text-sm text-tg-text font-semibold mb-1">
          О безопасности
        </div>
        <div className="text-sm text-tg-hint">
          Протокол VLESS+Reality. Трафик неотличим от обычного — провайдер не видит VPN.
        </div>
      </div>
    </div>
  );
}
