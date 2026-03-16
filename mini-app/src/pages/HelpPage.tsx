import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import {
  ShoppingCart,
  Key,
  Smartphone,
  Plus,
  Rocket,
  ChevronDown,
  ExternalLink,
  Monitor,
  Apple,
} from 'lucide-react';

/* ───────── Quick-start steps ───────── */

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
    title: 'Скачайте приложение',
    text: 'Выберите клиент для своей платформы (см. ниже)',
    color: 'from-brand-orange to-brand-pink',
  },
  {
    icon: Plus,
    title: 'Добавьте ключ',
    text: 'Откройте приложение, нажмите + и вставьте скопированный ключ',
    color: 'from-brand-pink to-brand-red',
  },
  {
    icon: Rocket,
    title: 'Подключайтесь',
    text: 'Нажмите кнопку подключения — готово!',
    color: 'from-brand-green to-teal-500',
  },
];

/* ───────── Platform data ───────── */

interface AppInfo {
  name: string;
  storeUrl: string;
  storeName: string;
}

interface PlatformData {
  id: string;
  label: string;
  icon: typeof Smartphone;
  apps: AppInfo[];
  steps: string[];
}

const PLATFORMS: PlatformData[] = [
  {
    id: 'ios',
    label: 'iOS',
    icon: Apple,
    apps: [
      {
        name: 'Hiddify',
        storeUrl: 'https://apps.apple.com/app/hiddify-proxy-vpn/id6596777532',
        storeName: 'App Store',
      },
      {
        name: 'Streisand',
        storeUrl: 'https://apps.apple.com/app/streisand/id6450534064',
        storeName: 'App Store',
      },
    ],
    steps: [
      'Скачайте Hiddify или Streisand из App Store',
      'Скопируйте ключ подключения (на главной странице или через /key в боте)',
      'Откройте приложение и нажмите кнопку «+» (добавить профиль)',
      'Выберите «Добавить из буфера обмена» — ключ вставится автоматически',
      'Нажмите кнопку подключения — VPN активен!',
    ],
  },
  {
    id: 'android',
    label: 'Android',
    icon: Smartphone,
    apps: [
      {
        name: 'Hiddify',
        storeUrl: 'https://play.google.com/store/apps/details?id=app.hiddify.com',
        storeName: 'Google Play',
      },
      {
        name: 'v2rayNG',
        storeUrl: 'https://play.google.com/store/apps/details?id=com.v2ray.ang',
        storeName: 'Google Play',
      },
    ],
    steps: [
      'Скачайте Hiddify или v2rayNG из Google Play',
      'Скопируйте ключ подключения (на главной странице или через /key в боте)',
      'Откройте приложение и нажмите «+» для добавления конфигурации',
      'Выберите «Импорт из буфера обмена» — ключ подставится автоматически',
      'Нажмите кнопку подключения — VPN работает!',
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: Monitor,
    apps: [
      {
        name: 'Hiddify',
        storeUrl: 'https://github.com/hiddify/hiddify-app/releases/latest',
        storeName: 'GitHub',
      },
      {
        name: 'Nekoray',
        storeUrl: 'https://github.com/MatsuriDayo/nekoray/releases/latest',
        storeName: 'GitHub',
      },
    ],
    steps: [
      'Скачайте Hiddify или Nekoray с GitHub (ссылки ниже)',
      'Установите приложение и запустите его',
      'Скопируйте ключ подключения (на главной странице или через /key в боте)',
      'В приложении нажмите «+» или «Добавить профиль из буфера обмена»',
      'Нажмите кнопку подключения — VPN активен!',
    ],
  },
  {
    id: 'macos',
    label: 'macOS',
    icon: Apple,
    apps: [
      {
        name: 'Hiddify',
        storeUrl: 'https://github.com/hiddify/hiddify-app/releases/latest',
        storeName: 'GitHub',
      },
      {
        name: 'FoXray',
        storeUrl: 'https://apps.apple.com/app/foxray/id6448898396',
        storeName: 'App Store',
      },
    ],
    steps: [
      'Скачайте Hiddify (GitHub) или FoXray (App Store)',
      'Установите и откройте приложение',
      'Скопируйте ключ подключения (на главной странице или через /key в боте)',
      'В приложении добавьте новый профиль из буфера обмена',
      'Нажмите кнопку подключения — VPN работает!',
    ],
  },
];

/* ───────── Component ───────── */

export function HelpPage() {
  const navigate = useNavigate();
  const { backButton, tg } = useTelegram();
  const [openPlatform, setOpenPlatform] = useState<string | null>(null);

  useEffect(() => {
    backButton?.show();
    const goBack = () => navigate(-1);
    backButton?.onClick(goBack);
    return () => {
      backButton?.offClick(goBack);
      backButton?.hide();
    };
  }, [navigate, backButton]);

  const togglePlatform = (id: string) => {
    setOpenPlatform((prev) => (prev === id ? null : id));
  };

  const openLink = (url: string) => {
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="p-4 pb-4 space-y-4">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-tg-text">Как подключиться</h1>
        <p className="text-sm text-tg-hint">5 простых шагов</p>
      </div>

      {/* Quick-start steps */}
      <div className="space-y-3 animate-slide-up">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-4 bg-tg-secondary rounded-2xl p-4"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}
              >
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

      {/* Platform-specific instructions */}
      <div className="animate-slide-up">
        <h2 className="text-lg font-bold text-tg-text mb-3">
          Инструкции по платформам
        </h2>
        <div className="space-y-2">
          {PLATFORMS.map((platform) => {
            const isOpen = openPlatform === platform.id;
            const Icon = platform.icon;
            return (
              <div
                key={platform.id}
                className="bg-tg-secondary rounded-2xl overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  onClick={() => togglePlatform(platform.id)}
                  className="w-full flex items-center gap-3 p-4 active:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold text-tg-text">
                    {platform.label}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-tg-hint transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Accordion content */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* Steps */}
                    <ol className="space-y-2">
                      {platform.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="font-bold text-brand-purple flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="text-tg-text">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {/* App links */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-tg-hint uppercase tracking-wide">
                        Скачать
                      </div>
                      {platform.apps.map((app) => (
                        <button
                          key={app.name}
                          onClick={() => openLink(app.storeUrl)}
                          className="w-full flex items-center gap-3 p-3 bg-tg-bg rounded-xl active:scale-[0.98] transition-transform"
                        >
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-tg-text">
                              {app.name}
                            </div>
                            <div className="text-xs text-tg-hint">
                              {app.storeName}
                            </div>
                          </div>
                          <ExternalLink size={16} className="text-tg-link" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security note */}
      <div className="bg-brand-purple/10 rounded-2xl p-4 animate-slide-up">
        <div className="text-sm text-tg-text font-semibold mb-1">
          О безопасности
        </div>
        <div className="text-sm text-tg-hint">
          Протокол VLESS+Reality. Трафик неотличим от обычного — провайдер не
          видит VPN.
        </div>
      </div>
    </div>
  );
}
