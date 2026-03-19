import { InlineKeyboard } from 'grammy';
import { Plan } from '../plan/plan.entity';
import { Server } from '../server/server.entity';
import { getLocationFlag, getLoadEmoji, getLoadLabel } from './bot.messages';

export function mainMenuKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .webApp('🛒 Тарифы', miniAppUrl)
    .row()
    .text('💬 Поддержка', 'support');
}

export function plansKeyboard(plans: Plan[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const plan of plans) {
    const trafficLabel =
      plan.trafficLimitGB > 0 ? `${plan.trafficLimitGB} ГБ` : '∞';
    kb.text(
      `${plan.name} — ${plan.price}₽ · ${trafficLabel}`,
      `buy_stars:${plan.id}`,
    ).row();
  }
  kb.text('← Назад', 'menu');
  return kb;
}

export function paymentMethodKeyboard(planId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('Telegram Stars', `pay_stars:${planId}`)
    .row()
    .text('Карта / СБП', `pay_yokassa:${planId}`)
    .row()
    .text('← Назад', 'plans');
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('← Меню', 'menu');
}

export function statusKeyboard(miniAppUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Ключ', 'key')
    .text('Сервер', 'server')
    .row()
    .text('Трафик', 'traffic')
    .text('Продлить', 'renew')
    .row()
    .text('← Меню', 'menu');
}

export function renewKeyboard(
  miniAppUrl: string,
  currentPlanId?: number,
): InlineKeyboard {
  const kb = new InlineKeyboard()
    .webApp(
      'Продлить текущий',
      `${miniAppUrl}/plans/${currentPlanId || ''}/pay`,
    )
    .row()
    .webApp('Все тарифы', miniAppUrl)
    .row()
    .text('← Меню', 'menu');
  return kb;
}

export function serverKeyboard(
  servers: Server[],
  currentServerId?: number,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const server of servers) {
    const flag = getLocationFlag(server.location);
    const load = getLoadEmoji(server.currentClients, server.maxClients);
    const loadPct = getLoadLabel(server.currentClients, server.maxClients);
    const current = server.id === currentServerId ? ' ✓' : '';
    kb.text(
      `${flag} ${server.location} ${load} ${loadPct}${current}`,
      `change_server:${server.id}`,
    ).row();
  }
  kb.text('« Меню', 'menu');
  return kb;
}
