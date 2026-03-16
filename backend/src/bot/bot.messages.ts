export const messages = {
  welcome: (name?: string) =>
    `Йо${name ? `, ${name}` : ''}! 👋\n\n` +
    `Добро пожаловать в безопасный интернет 🔐\n\n` +
    `Здесь ты получишь VPN, который:\n` +
    `  ⚡ Работает на скорости провайдера\n` +
    `  🫥 Невидим для блокировок (VLESS+Reality)\n` +
    `  📱 До 5 устройств одновременно\n\n` +
    `Жми кнопку — и поехали 🚀`,

  menu: '👋 Привет! Чем могу помочь?',

  noSubscription:
    'У тебя пока нет подписки 🤔\n\n' +
    'Это легко исправить — выбери тариф ниже,\n' +
    'и через минуту будешь в сети! ⚡',

  status: (planName: string, expiresDate: string, traffic: string, server: string) =>
    `📋 Твоя подписка\n\n` +
    `Тариф:   ${planName}\n` +
    `Сервер:  ${server}\n` +
    `Трафик:  ${traffic}\n` +
    `Активна до: ${expiresDate}\n\n` +
    `Всё работает ✅ Приятного сёрфинга!`,

  key: (connectionLink: string) =>
    `🔑 Вот твой ключ:\n\n` +
    `\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    `Нажми на ключ, чтобы скопировать.\n` +
    `Потом открой Hiddify и вставь его туда.\n\n` +
    `Если что-то непонятно — жми /help, помогу! 😊`,

  noKey: 'У тебя пока нет ключа 🔑\n\nОформи подписку — и ключ сразу появится!',

  help:
    '💡 Как подключиться за 2 минуты\n\n' +
    '1. Оформи подписку (кнопка «Магазин»)\n' +
    '2. Скопируй ключ (кнопка «Ключ» или /key)\n' +
    '3. Скачай приложение Hiddify:\n' +
    '   iPhone → App Store\n' +
    '   Android → Google Play\n' +
    '   ПК → hiddify.com\n' +
    '4. В Hiddify нажми + и вставь ключ\n' +
    '5. Нажми «Подключить» — готово! 🎉\n\n' +
    'Если застрял на каком-то шаге — напиши, разберёмся вместе 🤝',

  plans: 'Вот наши тарифы 👇\n\nВыбери тот, который подходит тебе:',

  selectPayment: 'Как удобнее оплатить? 💰',

  paymentSuccess: (connectionLink: string) =>
    'Оплата прошла, ты в деле! 🎉\n\n' +
    `🔑 Твой ключ:\n\n\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    'Нажми на ключ, чтобы скопировать.\n' +
    'Вставь его в Hiddify и подключайся!\n\n' +
    'Если нужна помощь с настройкой → /help',

  yokassaPay: (planName: string, price: number) =>
    `${planName} — ${price} ₽\n\n` +
    `Нажми кнопку, чтобы перейти к оплате 👇`,

  yokassaError: 'Упс, что-то пошло не так с оплатой 😕\nПопробуй ещё раз или выбери оплату Stars.',

  serverSelect: 'Выбери сервер 🌍\n\nЗелёный — мало людей, жёлтый — средне, красный — загружен.',

  serverChanged: (location: string) =>
    `Готово! Сервер сменён на ${location} ✅\n\n` +
    `Ключ обновился — скопируй его заново: /key`,

  serverChangeError: 'Не получилось сменить сервер 😕\nПопробуй чуть позже.',

  trialActivated: (connectionLink: string) =>
    'Добро пожаловать! Вот твой пробный день 🎁\n\n' +
    `🔑 Ключ:\n\n\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    'Скопируй и вставь в Hiddify.\n' +
    'Если понравится — оформи подписку в магазине 😊',

  trialAlreadyUsed: 'Ты уже использовал пробный период 😊\n\nОформи подписку — тарифы от 99 ₽!',

  trialSuccess: (planName: string, connectionLink: string) =>
    'Ура, пробный период активирован! 🎁\n\n' +
    `Тариф: ${planName} (1 день)\n\n` +
    `🔑 Твой ключ:\n\n\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    'Нажми на ключ, чтобы скопировать.\n' +
    'Вставь в Hiddify и пользуйся!\n\n' +
    'Если понравится — оформи подписку в магазине 😊',

  trialError: 'Ой, не получилось активировать пробный период 😕\nПопробуй чуть позже!',

  noPlans: 'Тарифы пока недоступны, но скоро появятся! Загляни позже 😊',

  promoHint: 'Введи промокод после команды, вот так:\n/promo ТВОЙКОД',

  promoInvalid: (error: string) => `Этот промокод не работает: ${error} 😕`,

  promoValid: (discountPercent: number, bonusDays: number) => {
    let text = 'Промокод принят! 🎉\n\n';
    if (discountPercent > 0) text += `💰 Скидка: ${discountPercent}%\n`;
    if (bonusDays > 0) text += `🎁 Бонус: +${bonusDays} дней\n`;
    text += '\nПримени его при оплате в магазине!';
    return text;
  },

  referralInfo: (link: string, count: number, bonusDays: string, referredBonusDays: string) =>
    `🤝 Твоя реферальная ссылка:\n\n\`${link}\`\n\n` +
    `Приглашено друзей: ${count}\n\n` +
    `Что получаете:\n` +
    `  Ты → +${bonusDays} дней к подписке\n` +
    `  Друг → +${referredBonusDays} день к подписке\n\n` +
    `Выгодно обоим! Отправь ссылку друзьям 👇`,

  referralNewUser: (name: string, bonusDays: string, referredBonusDays: string) =>
    `Класс! По твоей ссылке пришёл ${name} 🎉\n\n` +
    `Когда он купит подписку:\n` +
    `  Тебе → +${bonusDays} дней\n` +
    `  Ему → +${referredBonusDays} день`,

  referralBonusToReferrer: (name: string, bonusDays: string) =>
    `${name} купил подписку по твоей ссылке! 🎉\n` +
    `Тебе начислено +${bonusDays} дней. Приятного пользования!`,

  referralBonusToReferred: (bonusDays: string) =>
    `Тебе начислен бонус +${bonusDays} день за приглашение! 🎁\n` +
    `Спасибо, что пришёл к нам 😊`,

  inlineShareText: (link: string) =>
    `Привет! Пользуюсь отличным VPN — быстрый и безопасный.\n\n` +
    `Подключайся по моей ссылке, и мы оба получим бонусные дни:\n${link}`,

  alreadyOnServer: 'Ты уже на этом сервере 😊',

  invoiceTitle: (planName: string) => `VPN ${planName}`,
  invoiceDescription: (days: number) => `Подписка на ${days} дней`,

  serverFailover: (oldLocation: string, newLocation: string, connectionLink: string) =>
    `Сервер ${oldLocation} временно недоступен 😕\n\n` +
    `Мы автоматически перевели тебя на ${newLocation} ✅\n\n` +
    `🔑 Новый ключ:\n\n\`\`\`\n${connectionLink}\n\`\`\`\n\n` +
    'Скопируй и вставь в Hiddify.',

  inactiveReminder:
    'Привет! Заметили, что ты не подключался к VPN уже несколько дней 🤔\n\n' +
    'Всё в порядке? Если нужна помощь с настройкой — жми /help!\n' +
    'Мы всегда на связи 😊',

  expiryWarning: (daysLeft: number, planName: string) =>
    `Привет! Твоя подписка ${planName} заканчивается через ${daysLeft} дн. ⏰\n\n` +
    'Продли, чтобы не потерять доступ к VPN!',

  subscriptionExpired: (planName: string) =>
    `Подписка ${planName} закончилась 😔\n\n` +
    'Продли в магазине — и снова в безопасном интернете!',
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
