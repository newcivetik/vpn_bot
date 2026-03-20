export const messages = {
  // ─── Приветствие ──────────────────────────────────────

  welcome: (name?: string) =>
    `Привет${name ? `, ${name}` : ''}! 👋\n\n` +
    `Я — твой VPN-бот 🛡\n` +
    `Быстрый и невидимый VLESS+Reality.\n\n` +
    `🔐 Провайдер не видит VPN\n` +
    `⚡ Высокая скорость\n` +
    `📱 До 5 устройств\n\n` +
    `Выбирай действие 👇`,

  onboarding: (name?: string) =>
    `Привет${name ? `, ${name}` : ''}! 👋\n\n` +
    `Я — твой VPN-бот 🛡\n` +
    `Быстрый и невидимый VLESS+Reality.\n\n` +
    `🔐 Провайдер не видит VPN\n` +
    `⚡ Высокая скорость\n` +
    `📱 До 5 устройств\n\n` +
    `Выбирай действие 👇`,

  menu: `🛡 SellWhy VPN\n\n` + `Выбирай действие 👇`,

  // ─── Подписка ─────────────────────────────────────────

  noSubscription:
    'У тебя пока нет активной подписки.\n\n' +
    'Подключение занимает 2 минуты — выбери подходящий тариф 👇',

  status: (
    planName: string,
    expiresDate: string,
    traffic: string,
    server: string,
    maxDevices?: number,
  ) =>
    `Твоя подписка\n\n` +
    `▸ Тариф: ${planName}\n` +
    `▸ Действует до: ${expiresDate}\n` +
    `▸ Трафик: ${traffic}\n` +
    `▸ Сервер: ${server}\n` +
    (maxDevices && maxDevices > 1 ? `▸ Устройств: ${maxDevices}\n` : '') +
    `\nВсё работает, подключение активно ✅`,

  // ─── Ключ ─────────────────────────────────────────────

  key: (connectionLink: string) =>
    `Твой ключ подключения:\n\n` +
    `\`${connectionLink}\`\n\n` +
    `Скопируй и вставь в приложение Happ.\n` +
    `Нужна помощь с настройкой? Нажми /help`,

  noKey:
    'У тебя пока нет ключа подключения.\n\n' +
    'Он появится после оформления подписки 👇',

  // ─── Помощь ───────────────────────────────────────────

  help: '📖 Инструкция по подключению\n\n' + 'Выбери своё устройство 👇',

  helpIos:
    '📱 Подключение на iPhone / iPad\n\n' +
    '1. Скачай Happ из App Store:\n' +
    '   https://apps.apple.com/app/happ-proxy-utility/id6504287215\n\n' +
    '2. Открой Happ\n\n' +
    '3. Нажми + (добавить профиль)\n\n' +
    '4. Выбери «Добавить из буфера обмена»\n' +
    '   (предварительно скопируй ключ командой /key)\n\n' +
    '5. Нажми кнопку подключения — готово! ✅\n\n' +
    '💡 Если не работает — попробуй сменить сервер: /server',

  helpAndroid:
    '🤖 Подключение на Android\n\n' +
    '1. Скачай Happ из Google Play:\n' +
    '   https://play.google.com/store/apps/details?id=com.happproxy\n\n' +
    '2. Открой Happ\n\n' +
    '3. Нажми + (добавить профиль)\n\n' +
    '4. Выбери «Добавить из буфера обмена»\n' +
    '   (предварительно скопируй ключ командой /key)\n\n' +
    '5. Нажми кнопку подключения — готово! ✅\n\n' +
    '💡 Если не работает — попробуй сменить сервер: /server',

  helpWindows:
    '💻 Подключение на Windows\n\n' +
    '1. Скачай Happ:\n' +
    '   https://github.com/Happ-proxy/happ-desktop/releases/latest\n\n' +
    '2. Установи и открой Happ\n\n' +
    '3. Нажми + → «Добавить из буфера обмена»\n' +
    '   (предварительно скопируй ключ командой /key)\n\n' +
    '4. Нажми кнопку подключения — готово! ✅\n\n' +
    '💡 Windows может запросить разрешение на VPN-подключение — нажми «Да»',

  helpMac:
    '🍎 Подключение на macOS\n\n' +
    '1. Скачай Happ:\n' +
    '   https://github.com/Happ-proxy/happ-desktop/releases/latest\n\n' +
    '2. Установи и открой Happ\n\n' +
    '3. Нажми + → «Добавить из буфера обмена»\n' +
    '   (предварительно скопируй ключ командой /key)\n\n' +
    '4. Нажми кнопку подключения — готово! ✅\n\n' +
    '💡 macOS попросит разрешение на VPN — введи пароль Mac и нажми «Разрешить»',

  // ─── Тарифы и оплата ──────────────────────────────────

  plans: 'Доступные тарифы\n\nВыбери подходящий вариант 👇',

  selectPayment: 'Выбери удобный способ оплаты 👇',

  paymentSuccess: (connectionLink: string) =>
    'Оплата прошла успешно! ✅\n\n' +
    `Твой ключ подключения:\n\n\`${connectionLink}\`\n\n` +
    'Скопируй его и вставь в Happ.\n' +
    'Инструкция по настройке — /help',

  yokassaPay: (planName: string, price: number) =>
    `Оплата картой\n\n` +
    `▸ Тариф: ${planName}\n` +
    `▸ Сумма: ${price} ₽\n\n` +
    `Нажми кнопку ниже для перехода к оплате 👇`,

  yokassaError:
    'Не удалось создать платёж. Попробуй чуть позже или выбери оплату через Telegram Stars.',

  // ─── Серверы ──────────────────────────────────────────

  serverSelect: 'Выбор сервера\n\nНажми на нужную локацию 👇',

  serverChanged: (location: string) =>
    `Сервер успешно изменён ✅\n\n` +
    `▸ Новая локация: ${location}\n\n` +
    `Ключ обновлён — скопируй его заново командой /key`,

  serverChangeError:
    'Не удалось сменить сервер. Попробуй ещё раз через пару минут.',

  serverIssue: (currentLocation: string, suggestedLocation: string) =>
    `Мы заметили нестабильную работу сервера ${currentLocation}.\n\n` +
    `Рекомендуем переключиться на ${suggestedLocation} — он работает стабильно.\n\n` +
    `Сменить сервер → /server`,

  // ─── Уведомления об истечении ─────────────────────────

  expiryNotification: (
    planName: string,
    daysLeft: number,
    pluralDays: string,
  ) => {
    if (daysLeft <= 1) {
      return (
        `Подписка «${planName}» заканчивается сегодня.\n\n` +
        `Продли сейчас, чтобы не потерять доступ к VPN 👇`
      );
    }
    if (daysLeft <= 3) {
      return (
        `Подписка «${planName}» заканчивается через ${daysLeft} ${pluralDays}.\n\n` +
        `Рекомендуем продлить заранее — так не будет перерыва в работе VPN 👇`
      );
    }
    return (
      `Напоминание: подписка «${planName}» заканчивается через ${daysLeft} ${pluralDays}.\n\n` +
      `Можешь продлить в любое время через бота или приложение 👇`
    );
  },

  subscriptionExpired: (planName: string) =>
    `Подписка «${planName}» завершилась.\n\n` +
    `VPN-соединение отключено. Чтобы вернуть доступ, оформи новую подписку 👇`,

  // ─── Продление ────────────────────────────────────────

  renew: (planName: string, expiresDate: string, daysLeft: number) => {
    const note =
      daysLeft <= 3
        ? 'Рекомендуем продлить заранее.'
        : 'Можешь продлить в любое время.';
    return (
      `Продление подписки\n\n` +
      `▸ Тариф: ${planName}\n` +
      `▸ Действует до: ${expiresDate}\n` +
      `▸ Осталось: ${daysLeft} дн.\n\n` +
      `${note} Выбери способ продления 👇`
    );
  },

  noSubRenew:
    'У тебя нет активной подписки.\n\n' + 'Оформи новую — выбери тариф 👇',

  // ─── Трафик ───────────────────────────────────────────

  trafficStatus: (
    planName: string,
    usedGB: number,
    limitGB: number,
    daysLeft: number,
  ) => {
    if (limitGB <= 0) {
      return (
        `Использование трафика\n\n` +
        `▸ Тариф: ${planName}\n` +
        `▸ Использовано: ${usedGB.toFixed(1)} ГБ\n` +
        `▸ Лимит: безлимитный\n` +
        `▸ Осталось дней: ${daysLeft}`
      );
    }
    const pct = Math.round((usedGB / limitGB) * 100);
    const filled = Math.round(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return (
      `Использование трафика\n\n` +
      `▸ Тариф: ${planName}\n` +
      `▸ ${usedGB.toFixed(1)} из ${limitGB} ГБ (${pct}%)\n` +
      `  [${bar}]\n` +
      `▸ Осталось дней: ${daysLeft}`
    );
  },

  trafficWarning: (planName: string, usedGB: number, limitGB: number) => {
    const pct = Math.round((usedGB / limitGB) * 100);
    return (
      `Внимание: трафик почти исчерпан\n\n` +
      `Подписка «${planName}»: использовано ${usedGB.toFixed(1)} из ${limitGB} ГБ (${pct}%).\n\n` +
      `Когда лимит будет достигнут, VPN отключится.\n` +
      `Рекомендуем перейти на безлимитный тариф 👇`
    );
  },

  trafficExhausted: (planName: string) =>
    `Лимит трафика исчерпан\n\n` +
    `Подписка «${planName}» приостановлена.\n\n` +
    `Оформи новую подписку, чтобы продолжить пользоваться VPN 👇`,

  // ─── Аккаунт ──────────────────────────────────────────

  account: (opts: {
    name: string;
    totalSubs: number;
    referralCount: number;
    bonusDays: number;
    referralCode: string;
    botUsername: string;
  }) =>
    `Твой аккаунт\n\n` +
    `▸ Имя: ${opts.name}\n` +
    `▸ Подписок: ${opts.totalSubs}\n` +
    `▸ Приглашённых друзей: ${opts.referralCount}\n` +
    `▸ Бонусных дней: ${opts.bonusDays}\n\n` +
    `Реферальная ссылка:\n` +
    `\`https://t.me/${opts.botUsername}?start=ref_${opts.referralCode}\`\n\n` +
    `Приглашай друзей — за каждого получишь бонусные дни!`,

  // ─── Уведомления ──────────────────────────────────────

  paymentSuccessNotification: (planName: string, expiresDate: string) =>
    `Оплата получена ✅\n\n` +
    `▸ Тариф: ${planName}\n` +
    `▸ Активна до: ${expiresDate}\n\n` +
    `VPN подключён и готов к работе.`,

  personalDiscountNotification: (
    discountPercent: number,
    bonusDays: number,
    reason?: string,
    expiresDate?: string,
  ) => {
    let text = `Для тебя персональное предложение!\n\n`;
    if (discountPercent > 0)
      text += `▸ Скидка ${discountPercent}% на следующую подписку\n`;
    if (bonusDays > 0) text += `▸ +${bonusDays} бонусных дней\n`;
    if (reason) text += `\n${reason}\n`;
    if (expiresDate) text += `\nПредложение действует до ${expiresDate}.`;
    text += `\n\nОткрой приложение, чтобы воспользоваться 👇`;
    return text;
  },
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
