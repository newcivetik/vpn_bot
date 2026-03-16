import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { PromoService } from '../promo/promo.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private onPaymentConfirmed?: (userId: number) => void;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly subscriptionService: SubscriptionService,
    private readonly promoService: PromoService,
  ) {}

  setOnPaymentConfirmed(cb: (userId: number) => void) {
    this.onPaymentConfirmed = cb;
  }

  async createStarsPayment(
    userId: number,
    planId: number,
    amount: number,
    promoCode?: string,
  ): Promise<Payment> {
    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount,
      method: PaymentMethod.STARS,
      status: PaymentStatus.PENDING,
    });

    if (promoCode) {
      const result = await this.promoService.validatePromo(promoCode, userId);
      if (result.valid && result.promo) {
        payment.promoCodeId = result.promo.id;
        payment.discountPercent = result.promo.discountPercent;
      }
    }

    return this.paymentRepo.save(payment);
  }

  async confirmStarsPayment(
    paymentId: number,
    telegramPaymentChargeId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new Error('Платёж не найден');

    payment.status = PaymentStatus.PAID;
    payment.externalId = telegramPaymentChargeId;
    await this.paymentRepo.save(payment);

    // Считаем бонусные дни из промокода
    const bonusDays = await this.getPromoBonusDays(payment);

    // Создаём подписку
    const subscription = await this.subscriptionService.createSubscription(
      payment.userId,
      payment.planId,
      bonusDays > 0 ? { bonusDays } : undefined,
    );
    payment.subscriptionId = subscription.id;
    await this.paymentRepo.save(payment);

    this.logger.log(`Оплата Stars #${payment.id} подтверждена, подписка #${subscription.id}`);
    return payment;
  }

  async createYokassaPayment(
    userId: number,
    planId: number,
    amount: number,
    options?: { promoCode?: string },
  ): Promise<{ payment: Payment; confirmationUrl: string }> {
    const shopId = process.env.YOKASSA_SHOP_ID;
    const secretKey = process.env.YOKASSA_SECRET_KEY;
    const returnUrl = process.env.YOKASSA_RETURN_URL || 'https://t.me';

    if (!shopId || !secretKey) {
      throw new Error('ЮKassa не настроена');
    }

    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount,
      method: PaymentMethod.YOKASSA,
      status: PaymentStatus.PENDING,
    });

    if (options?.promoCode) {
      const result = await this.promoService.validatePromo(options.promoCode, userId);
      if (result.valid && result.promo) {
        payment.promoCodeId = result.promo.id;
        payment.discountPercent = result.promo.discountPercent;
      }
    }

    const saved = await this.paymentRepo.save(payment);

    // Создаём платёж в ЮKassa (redirect mode — работает на мобильных)
    const idempotencyKey = `vpn_${saved.id}_${Date.now()}`;
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotencyKey,
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: { value: `${amount}.00`, currency: 'RUB' },
        confirmation: { type: 'redirect', return_url: returnUrl },
        capture: true,
        description: `VPN подписка #${saved.id}`,
        metadata: { paymentId: saved.id },
        receipt: {
          customer: { email: 'vpn@sellwhy.ru' },
          items: [
            {
              description: `VPN подписка #${saved.id}`,
              quantity: '1.00',
              amount: { value: `${amount}.00`, currency: 'RUB' },
              vat_code: 1,
              payment_subject: 'service',
              payment_mode: 'full_payment',
            },
          ],
        },
      }),
    });

    const yokassaPayment = await res.json();

    if (!res.ok) {
      this.logger.error(`ЮKassa API ошибка: ${JSON.stringify(yokassaPayment)}`);
      throw new Error(`ЮKassa: ${yokassaPayment.description || 'Ошибка создания платежа'}`);
    }

    saved.externalId = yokassaPayment.id;
    await this.paymentRepo.save(saved);

    const confirmationUrl = yokassaPayment.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      this.logger.error(`ЮKassa: нет confirmation_url: ${JSON.stringify(yokassaPayment)}`);
      throw new Error('ЮKassa: не получена ссылка на оплату');
    }
    return { payment: saved, confirmationUrl };
  }

  async handleYokassaWebhook(body: any): Promise<void> {
    if (body.event !== 'payment.succeeded') return;

    const yokassaId = body.object?.id;
    const payment = await this.paymentRepo.findOne({
      where: { externalId: yokassaId },
    });
    if (!payment || payment.status === PaymentStatus.PAID) return;

    payment.status = PaymentStatus.PAID;
    await this.paymentRepo.save(payment);

    // Считаем бонусные дни из промокода
    const bonusDays = await this.getPromoBonusDays(payment);

    const subscription = await this.subscriptionService.createSubscription(
      payment.userId,
      payment.planId,
      bonusDays > 0 ? { bonusDays } : undefined,
    );
    payment.subscriptionId = subscription.id;
    await this.paymentRepo.save(payment);

    this.logger.log(`Оплата ЮKassa #${payment.id} подтверждена, подписка #${subscription.id}`);

    // Notify about referral bonus
    this.onPaymentConfirmed?.(payment.userId);
  }

  /** Получает bonusDays из промокода, привязанного к платежу, и отмечает использование */
  private async getPromoBonusDays(payment: Payment): Promise<number> {
    if (!payment.promoCodeId) return 0;
    const promo = await this.promoService.findById(payment.promoCodeId);
    if (!promo) return 0;
    await this.promoService.applyPromo(promo.id, payment.userId);
    return promo.bonusDays || 0;
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }
}
