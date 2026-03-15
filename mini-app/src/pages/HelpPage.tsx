import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';

const STEPS = [
  {
    icon: '🛒',
    title: 'Купите подписку',
    text: 'Выберите тариф и оплатите через Stars или карту',
  },
  {
    icon: '🔑',
    title: 'Скопируйте ключ',
    text: 'Нажмите "Скопировать ключ" на главной странице или в боте (/key)',
  },
  {
    icon: '📱',
    title: 'Скачайте Hiddify',
    text: 'iPhone: App Store, Android: Google Play, Windows/Mac: hiddify.com',
  },
  {
    icon: '➕',
    title: 'Добавьте ключ',
    text: 'Откройте Hiddify → нажмите + → вставьте скопированный ключ',
  },
  {
    icon: '🚀',
    title: 'Подключайтесь',
    text: 'Нажмите кнопку подключения — готово!',
  },
];

export function HelpPage() {
  const navigate = useNavigate();
  const { backButton } = useTelegram();

  useEffect(() => {
    backButton?.show();
    const goBack = () => navigate('/');
    backButton?.onClick(goBack);
    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
    };
  }, [navigate, backButton]);

  return (
    <div className="p-4 pb-8 space-y-6">
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-tg-text">Как подключиться</h1>
        <p className="text-sm text-tg-hint">5 простых шагов</p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="flex items-start gap-4 bg-tg-secondary rounded-2xl p-4"
          >
            <div className="w-10 h-10 flex items-center justify-center text-xl flex-shrink-0">
              {step.icon}
            </div>
            <div>
              <div className="font-semibold text-tg-text text-sm">
                {i + 1}. {step.title}
              </div>
              <div className="text-sm text-tg-hint mt-0.5">{step.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-tg-button/10 rounded-2xl p-4">
        <div className="text-sm text-tg-text font-semibold mb-1">
          🔒 О безопасности
        </div>
        <div className="text-sm text-tg-hint">
          Используется протокол VLESS+Reality. Ваш трафик неотличим от обычного
          посещения сайтов. Провайдер не может определить, что вы используете VPN.
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full py-3 text-tg-link text-sm"
      >
        ← На главную
      </button>
    </div>
  );
}
