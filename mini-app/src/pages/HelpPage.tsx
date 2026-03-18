import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { ExternalLink } from 'lucide-react';

const STEPS = [
  {
    emoji: '🛒',
    title: 'Купите подписку',
    text: 'Выберите тариф и оплатите через Stars или карту',
    gradient: 'from-[#C9A0F0] to-[#A388D0]',
  },
  {
    emoji: '🔑',
    title: 'Скопируйте ключ',
    text: 'Нажмите «Копировать ключ» на главной или в боте (/key)',
    gradient: 'from-[#FFB080] to-[#FF8C9A]',
  },
  {
    emoji: '📱',
    title: 'Скачайте Hiddify',
    text: 'iPhone: App Store, Android: Google Play, Windows/Mac: hiddify.com',
    gradient: 'from-[#7DD4A8] to-[#5CC0C0]',
  },
  {
    emoji: '➕',
    title: 'Добавьте ключ',
    text: 'Откройте Hiddify → нажмите + → вставьте ключ',
    gradient: 'from-[#89B8F8] to-[#6BA3E8]',
  },
  {
    emoji: '🚀',
    title: 'Подключайтесь',
    text: 'Нажмите кнопку подключения — готово!',
    gradient: 'from-[#7DD4A8] to-[#5CC0C0]',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Какие протоколы поддерживаются?',
    a: 'VLESS + Reality — один из самых быстрых и незаметных протоколов.',
  },
  {
    q: 'Можно ли вернуть деньги?',
    a: 'Да, в течение 7 дней после оплаты.',
  },
  {
    q: 'Что если VPN не подключается?',
    a: 'Попробуйте сменить сервер. Если не помогает — напишите в поддержку.',
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
      {/* Header */}
      <div className="animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]">
        <h1 className="text-2xl font-black text-[#3D2C4E]">Помощь 💬</h1>
        <p className="text-sm font-semibold text-[#9B8AAB]">Начать проще, чем кажется</p>
      </div>

      {/* Steps */}
      <div>
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="flex gap-4 items-start mb-5 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            {/* Numbered bubble */}
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center flex-shrink-0 shadow-[0_4px_20px_rgba(100,60,120,0.15)]`}>
              <span className="text-xl font-black text-white">{i + 1}</span>
            </div>
            {/* Content card */}
            <div className="flex-1 bg-white rounded-[20px] p-5 shadow-[0_4px_20px_rgba(100,60,120,0.08)]">
              <h3 className="text-[15px] font-extrabold text-[#3D2C4E] mb-1">{step.emoji} {step.title}</h3>
              <p className="text-[13px] font-semibold text-[#6B5A7A] leading-relaxed">{step.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Download links */}
      <div className="bg-white rounded-3xl p-5 shadow-[0_8px_32px_rgba(100,60,120,0.10)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]" style={{ animationDelay: '500ms' }}>
        <div className="text-sm font-extrabold text-[#3D2C4E] mb-3">
          Скачать Hiddify
        </div>
        <div className="space-y-2">
          {[
            { label: '📱 iPhone / iPad', url: 'https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532' },
            { label: '🤖 Android', url: 'https://play.google.com/store/apps/details?id=app.hiddify.com' },
            { label: '💻 Windows / Mac / Linux', url: 'https://hiddify.com/app/' },
          ].map(({ label, url }) => (
            <button
              key={url}
              onClick={() => tg?.openLink(url, { try_instant_view: false })}
              aria-label={`Скачать Hiddify для ${label}`}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#FFF8F0] hover:bg-[#E8D5F5]/20 transition-all active:opacity-80"
            >
              <span className="text-sm font-semibold text-[#3D2C4E]">{label}</span>
              <ExternalLink size={14} className="text-[#9B8AAB]" />
            </button>
          ))}
        </div>
      </div>

      {/* Security card */}
      <div className="bg-gradient-to-br from-[#F0E4FA] to-[#E8D5F5] rounded-3xl p-5 animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]" style={{ animationDelay: '580ms' }}>
        <div className="text-sm font-extrabold text-[#3D2C4E] mb-1">
          О безопасности
        </div>
        <div className="text-sm font-semibold text-[#6B5A7A]">
          Протокол VLESS+Reality. Трафик неотличим от обычного — провайдер не видит VPN.
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="text-lg font-black text-[#3D2C4E] mt-6 mb-3">Частые вопросы</div>
        {FAQ_ITEMS.map(({ q, a }, i) => (
          <details
            key={i}
            className="bg-white rounded-[20px] mb-2.5 shadow-[0_4px_20px_rgba(100,60,120,0.08)] overflow-hidden group animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]"
            style={{ animationDelay: `${660 + i * 80}ms` }}
          >
            <summary className="p-4 text-sm font-bold text-[#3D2C4E] cursor-pointer flex justify-between items-center min-h-[48px] list-none">
              {q}
              <span className="text-xs text-[#9B8AAB] transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="px-4 pb-4 text-[13px] font-semibold text-[#6B5A7A] leading-relaxed">{a}</div>
          </details>
        ))}
      </div>

      {/* Support CTA */}
      <div className="bg-gradient-to-br from-[#F0E4FA] to-[#E8D5F5] rounded-3xl p-5 text-center mt-4 shadow-[0_8px_32px_rgba(100,60,120,0.10)] animate-[bounceIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_backwards]" style={{ animationDelay: '900ms' }}>
        <div className="text-3xl mb-2">🤝</div>
        <div className="text-base font-extrabold text-[#3D2C4E]">Нужна помощь?</div>
        <div className="text-xs font-semibold text-[#6B5A7A] mt-1">Ответим за 5 минут</div>
        <button className="mt-3 px-6 py-2.5 rounded-[50px] bg-gradient-to-br from-[#C9A0F0] to-[#89B8F8] text-white text-sm font-extrabold shadow-[0_6px_24px_rgba(160,130,210,0.3)]">
          Написать в поддержку 💬
        </button>
      </div>
    </div>
  );
}
