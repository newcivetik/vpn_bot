import { InlineKeyboard } from 'grammy';
import { Plan } from '../plan/plan.entity';

export function mainMenuKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('🛒 Открыть магазин', miniAppUrl)
    .row()
    .text('📊 Мой статус', 'status')
    .text('🔑 Мой ключ', 'key')
    .row()
    .text('❓ Помощь', 'help');
}

export function plansKeyboard(plans: Plan[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const plan of plans) {
    const trafficLabel = plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : 'Безлимит';
    kb.text(
      `${plan.name} — ${plan.price}₽ (${trafficLabel})`,
      `buy_stars:${plan.id}`,
    ).row();
  }
  return kb;
}

export function paymentMethodKeyboard(planId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('⭐ Telegram Stars', `pay_stars:${planId}`)
    .row()
    .text('💳 Карта (ЮKassa)', `pay_yokassa:${planId}`)
    .row()
    .text('« Назад', 'plans');
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('« Главное меню', 'menu');
}
