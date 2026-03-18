import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { ShoppingCart, Key, Smartphone, Plus, Rocket, ExternalLink } from 'lucide-react';

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
  const { tg, backButton } = useTelegram();

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

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-4 bg-tg-secondary rounded-2xl p-4 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-tg-hint">0{i + 1}</span>
                  <span className="font-semibold text-tg-text text-sm">{step.title}</span>
                </div>
                <div className="text-sm text-tg-hint mt-0.5">{step.text}</div>
              </div>
            </div>
          );
        })}

        {/* Completion */}
        <div className="text-center py-4 animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <p className="text-sm text-tg-hint">Готово за 2 минуты</p>
        </div>
      </div>

      {/* Download links */}
      <div className="bg-tg-secondary rounded-2xl p-4 space-y-2 animate-slide-up">
        <div className="text-sm text-tg-text font-semibold mb-2">
          Скачать Hiddify
        </div>
        {[
          { label: '📱 iPhone / iPad', url: 'https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532' },
          { label: '🤖 Android', url: 'https://play.google.com/store/apps/details?id=app.hiddify.com' },
          { label: '💻 Windows / Mac / Linux', url: 'https://hiddify.com/app/' },
        ].map(({ label, url }) => (
          <button
            key={url}
            onClick={() => tg?.openLink(url, { try_instant_view: false })}
            aria-label={`Скачать Hiddify для ${label}`}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-tg-bg active:opacity-80 transition-all hover:bg-tg-hint/5"
          >
            <span className="text-sm text-tg-text">{label}</span>
            <ExternalLink size={14} className="text-tg-hint" />
          </button>
        ))}
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
