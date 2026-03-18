export const messages = {
  welcome: (name?: string) =>
    `Привет${name ? `, ${name}` : ''}! 👋\n\n` +
    `Я — твой VPN-бот 🛡\n` +
    `Быстрый и невидимый VLESS+Reality.\n\n` +
    `🔐 Провайдер не видит VPN\n` +
    `⚡ Высокая скорость\n` +
    `📱 До 5 устройств\n\n` +
    `Выбирай действие 👇`,

  menu: '🛡 VPN-бот\n\nЧто делаем? 👇',

  noSubscription:
    '😔 У тебя пока нет подписки.\n\n' +
    'Выбери тариф и подключись за пару минут! 🚀',

  status: (
    planName: string,
    expiresDate: string,
    traffic: string,
    server: string,
  ) =>
    `📊 Твоя подписка\n\n` +
    `🛡 Тариф: ${planName}\n` +
    `📅 До: ${expiresDate}\n` +
    `📈 Трафик: ${traffic}\n` +
    `🌍 Сервер: ${server}\n\n` +
    `Твой щит работает ✅`,

  key: (connectionLink: string) =>
    `🔑 Твой ключ подключения:\n\n` +
    `\`${connectionLink}\`\n\n` +
    `📱 Вставь его в Hiddify\n` +
    `💡 Не знаешь как? Жми /help`,

  noKey: '😔 У тебя нет активного ключа.\n\nСначала оформи подписку! 🚀',

  help:
    '📖 Как подключиться\n\n' +
    '1️⃣ Купи подписку — через бота или мини-приложение\n\n' +
    '2️⃣ Скопируй ключ — /key или в мини-приложении\n\n' +
    '3️⃣ Скачай Hiddify:\n' +
    '   📱 iPhone → App Store\n' +
    '   🤖 Android → Google Play\n' +
    '   💻 Windows/Mac → hiddify.com\n\n' +
    '4️⃣ Открой Hiddify → ➕ → вставь ключ\n\n' +
    '5️⃣ Нажми «Подключить» — готово! 🎉\n\n' +
    '🔐 VLESS+Reality — невидим для провайдера',

  plans: '🛒 Тарифы\n\nВыбери подходящий 👇',

  selectPayment: '💰 Выбери способ оплаты 👇',

  paymentSuccess: (connectionLink: string) =>
    '🎉 Оплата прошла!\n\n' +
    `🔑 Твой ключ:\n\n\`${connectionLink}\`\n\n` +
    '📱 Скопируй и вставь в Hiddify\n' +
    '❓ Как подключить → /help',

  yokassaPay: (planName: string, price: number) =>
    `💳 Оплата: ${planName} — ${price}₽\n\n` +
    `Нажми кнопку для перехода к оплате 👇`,

  yokassaError:
    '😔 Ошибка создания платежа.\nПопробуй позже или выбери оплату Stars.',

  serverSelect: '🌍 Выбор сервера\n\nВыбери сервер 👇',

  serverChanged: (location: string) =>
    `✅ Сервер изменён!\n\n🌍 Новый сервер: ${location}\n\n` +
    `🔑 Твой ключ обновлён — скопируй его заново: /key`,

  serverChangeError: '😔 Не удалось сменить сервер. Попробуй позже.',

  expiryNotification: (
    planName: string,
    daysLeft: number,
    pluralDays: string,
  ) => {
    const emoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⚠️' : '📢';
    const urgency =
      daysLeft <= 1
        ? 'Последний день!'
        : daysLeft <= 3
          ? 'Осталось совсем немного'
          : 'Скоро истекает';
    return (
      `${emoji} ${urgency}\n\n` +
      `Подписка «${planName}» заканчивается через ${daysLeft} ${pluralDays}.\n\n` +
      `💰 Продли сейчас со скидкой 15%!\n` +
      `Используй промокод RENEW15 при оплате 🎁`
    );
  },

  serverIssue: (currentLocation: string, suggestedLocation: string) =>
    `⚡ Заметили проблему с сервером ${currentLocation}\n\n` +
    `Рекомендуем переключиться на ${suggestedLocation} — он работает стабильно.\n\n` +
    `Переключить → /server`,

  onboarding: (name?: string) =>
    `🎉 Добро пожаловать${name ? `, ${name}` : ''}!\n\n` +
    `Я помогу тебе настроить безопасный VPN за 2 минуты.\n\n` +
    `Вот что умею:\n` +
    `🛒 Магазин — выбрать тариф\n` +
    `🌍 Сервер — сменить локацию\n` +
    `📊 Статус — проверить подписку\n` +
    `🔑 Ключ — скопировать конфиг\n` +
    `❓ Помощь — инструкция по настройке\n\n` +
    `Начни с выбора тарифа 👇`,

  trafficStatus: (
    planName: string,
    usedGB: number,
    limitGB: number,
    daysLeft: number,
  ) => {
    if (limitGB <= 0) {
      return (
        `📊 Трафик\n\n` +
        `🛡 Тариф: ${planName}\n` +
        `📈 Использовано: ${usedGB.toFixed(1)} ГБ\n` +
        `♾ Безлимитный\n` +
        `📅 Осталось: ${daysLeft} дн.`
      );
    }
    const pct = Math.round((usedGB / limitGB) * 100);
    const filled = Math.round(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return (
      `📊 Трафик\n\n` +
      `🛡 Тариф: ${planName}\n` +
      `📈 ${usedGB.toFixed(1)} / ${limitGB} ГБ (${pct}%)\n` +
      `[${bar}]\n` +
      `📅 Осталось: ${daysLeft} дн.`
    );
  },

  trafficWarning: (planName: string, usedGB: number, limitGB: number) => {
    const pct = Math.round((usedGB / limitGB) * 100);
    return (
      `⚠️ Трафик почти исчерпан\n\n` +
      `Подписка «${planName}»: ${usedGB.toFixed(1)} из ${limitGB} ГБ (${pct}%)\n\n` +
      `Когда лимит будет достигнут, VPN отключится.\n` +
      `💡 Перейди на безлимитный тариф!`
    );
  },

  trafficExhausted: (planName: string) =>
    `🚫 Лимит трафика исчерпан\n\n` +
    `Подписка «${planName}» отключена.\n\n` +
    `Оформи новую подписку, чтобы продолжить 👇`,
};

const LOCATION_FLAGS: Record<string, string> = {
  Нидерланды: '🇳🇱',
  Германия: '🇩🇪',
  Финляндия: '🇫🇮',
  США: '🇺🇸',
  Сингапур: '🇸🇬',
  Турция: '🇹🇷',
  Великобритания: '🇬🇧',
  Франция: '🇫🇷',
  Япония: '🇯🇵',
  Канада: '🇨🇦',
};

export function getLocationFlag(location: string): string {
  return LOCATION_FLAGS[location] || '🌐';
}

export function getLoadEmoji(current: number, max: number): string {
  const pct = current / max;
  if (pct < 0.5) return '🟢';
  if (pct < 0.8) return '🟡';
  return '🔴';
}

export function getLoadLabel(current: number, max: number): string {
  const pct = Math.round((current / max) * 100);
  return `${pct}%`;
}
