export const messages = {
  welcome: (name?: string) =>
    `Привет${name ? `, ${name}` : ''}! 👋\n\n` +
    `Я — твой VPN-бот 🛡\n` +
    `Быстрый и невидимый VLESS+Reality.\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🔐 Провайдер не видит VPN\n` +
    `⚡ Высокая скорость\n` +
    `📱 До 5 устройств\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `Выбирай действие 👇`,

  menu: '🛡 VPN-бот\n\nЧто делаем? 👇',

  noSubscription:
    '😔 У тебя пока нет подписки.\n\n' +
    'Выбери тариф и подключись за пару минут! 🚀',

  status: (planName: string, expiresDate: string, traffic: string, server: string) =>
    `📊 Твоя подписка\n` +
    `━━━━━━━━━━━━━━━\n\n` +
    `🛡 Тариф: ${planName}\n` +
    `📅 До: ${expiresDate}\n` +
    `📈 Трафик: ${traffic}\n` +
    `🌍 Сервер: ${server}\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `Твой щит работает ✅`,

  key: (connectionLink: string) =>
    `🔑 Твой ключ подключения:\n\n` +
    `\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📱 Нажми на ключ, чтобы скопировать, и вставь в Hiddify\n` +
    `💡 Не знаешь как? Жми /help`,

  noKey: '😔 У тебя нет активного ключа.\n\nСначала оформи подписку! 🚀',

  help:
    '📖 Как подключиться\n' +
    '━━━━━━━━━━━━━━━\n\n' +
    '1️⃣ Купи подписку — через бота или мини-приложение\n\n' +
    '2️⃣ Скопируй ключ — /key или в мини-приложении\n\n' +
    '3️⃣ Скачай Hiddify:\n' +
    '   📱 iPhone → App Store\n' +
    '   🤖 Android → Google Play\n' +
    '   💻 Windows/Mac → hiddify.com\n\n' +
    '4️⃣ Открой Hiddify → ➕ → вставь ключ\n\n' +
    '5️⃣ Нажми «Подключить» — готово! 🎉\n\n' +
    '━━━━━━━━━━━━━━━\n' +
    '🔐 VLESS+Reality — невидим для провайдера',

  plans: '🛒 Тарифы\n━━━━━━━━━━━━━━━\n\nВыбери подходящий 👇',

  selectPayment: '💰 Выбери способ оплаты 👇',

  paymentSuccess: (connectionLink: string) =>
    '🎉 Оплата прошла!\n\n' +
    `🔑 Твой ключ:\n\n\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    '━━━━━━━━━━━━━━━\n' +
    '📱 Нажми на ключ, чтобы скопировать, и вставь в Hiddify\n' +
    '❓ Как подключить → /help',

  yokassaPay: (planName: string, price: number) =>
    `💳 Оплата: ${planName} — ${price}₽\n\n` +
    `Нажми кнопку для перехода к оплате 👇`,

  yokassaError: '😔 Ошибка создания платежа.\nПопробуй позже или выбери оплату Stars.',

  serverSelect: '🌍 Выбор сервера\n━━━━━━━━━━━━━━━\n\nВыбери сервер 👇',

  serverChanged: (location: string) =>
    `✅ Сервер изменён!\n\n🌍 Новый сервер: ${location}\n\n` +
    `🔑 Твой ключ обновлён — скопируй его заново: /key`,

  serverChangeError: '😔 Не удалось сменить сервер. Попробуй позже.',
};

const LOCATION_FLAGS: Record<string, string> = {
  'Нидерланды': '🇳🇱',
  'Германия': '🇩🇪',
  'Финляндия': '🇫🇮',
  'США': '🇺🇸',
  'Сингапур': '🇸🇬',
  'Турция': '🇹🇷',
  'Великобритания': '🇬🇧',
  'Франция': '🇫🇷',
  'Япония': '🇯🇵',
  'Канада': '🇨🇦',
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
