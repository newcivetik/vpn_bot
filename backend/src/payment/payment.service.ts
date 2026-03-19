import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigService } from '@nestjs/config';
import { PromoService } from '../promo/promo.service';
import { BotService } from '../bot/bot.service';
import { messages } from '../bot/bot.messages';
import { User } from '../user/user.entity';
import { Plan } from '../plan/plan.entity';
import { AdminNotifyService } from '../shared/admin-notify/admin-notify.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
    private readonly promoService: PromoService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly dataSource: DataSource,
    private readonly adminNotify: AdminNotifyService,
  ) {}

  async createStarsPayment(
    userId: number,
    planId: number,
    amount: number,
    promoCode?: string,
  ): Promise<Payment> {
    const { discountPercent, promoCodeId, personalDiscountId, finalAmount } =
      await this.resolveDiscount(userId, amount, promoCode);

    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount: finalAmount,
      method: PaymentMethod.STARS,
      status: PaymentStatus.PENDING,
      discountPercent,
      promoCodeId,
      personalDiscountId,
    });
    return this.paymentRepo.save(payment);
  }

  async confirmStarsPayment(
    paymentId: number,
    telegramPaymentChargeId: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('Платёж не найден');
      if (payment.status === PaymentStatus.PAID) return payment;

      payment.status = PaymentStatus.PAID;
      payment.externalId = telegramPaymentChargeId;
      await manager.save(payment);

      const subscription = await this.subscriptionService.createSubscription(
        payment.userId,
        payment.planId,
      );
      payment.subscriptionId = subscription.id;
      await manager.save(payment);

      if (payment.promoCodeId) {
        await this.promoService.applyPromo(payment.promoCodeId, payment.userId);
      }
      if (payment.personalDiscountId) {
        await this.promoService.applyPersonalDiscount(
          payment.personalDiscountId,
        );
      }

      this.logger.log(
        `Оплата Stars #${payment.id} подтверждена, подписка #${subscription.id}`,
      );

      // Send notification outside transaction (fire-and-forget)
      this.sendPaymentNotification(
        payment.userId,
        payment.planId,
        subscription.id,
      );

      return payment;
    });
  }

  async createYokassaPayment(
    userId: number,
    planId: number,
    amount: number,
    options?: { embedded?: boolean; promoCode?: string },
  ): Promise<{
    payment: Payment;
    confirmationToken?: string;
    confirmationUrl?: string;
  }> {
    const shopId = this.configService.get<string>('YOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOKASSA_SECRET_KEY');
    const returnUrl = this.configService.get<string>('YOKASSA_RETURN_URL');

    if (!shopId || !secretKey) {
      throw new BadRequestException('ЮKassa не настроена');
    }

    const embedded = options?.embedded ?? false;

    const { discountPercent, promoCodeId, personalDiscountId, finalAmount } =
      await this.resolveDiscount(userId, amount, options?.promoCode);

    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount: finalAmount,
      method: PaymentMethod.YOKASSA,
      status: PaymentStatus.PENDING,
      discountPercent,
      promoCodeId,
      personalDiscountId,
    });
    const saved = await this.paymentRepo.save(payment);

    const confirmation = embedded
      ? { type: 'embedded' }
      : { type: 'redirect', return_url: returnUrl || 'https://t.me' };

    const idempotencyKey = `vpn_payment_${saved.id}`;
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      signal: AbortSignal.timeout(15000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotencyKey,
        Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        amount: { value: `${finalAmount}.00`, currency: 'RUB' },
        confirmation,
        capture: true,
        description: `VPN подписка #${saved.id}`,
        metadata: { paymentId: saved.id },
        receipt: {
          customer: { email: 'vpn@sellwhy.ru' },
          items: [
            {
              description: `VPN подписка #${saved.id}`,
              quantity: '1.00',
              amount: { value: `${finalAmount}.00`, currency: 'RUB' },
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
      throw new BadRequestException(
        `ЮKassa: ${yokassaPayment.description || 'Ошибка создания платежа'}`,
      );
    }

    saved.externalId = yokassaPayment.id;
    await this.paymentRepo.save(saved);

    if (embedded) {
      const confirmationToken = yokassaPayment.confirmation?.confirmation_token;
      if (!confirmationToken) {
        this.logger.error(
          `ЮKassa: нет confirmation_token: ${JSON.stringify(yokassaPayment)}`,
        );
        throw new BadRequestException('ЮKassa: не получен токен оплаты');
      }
      return { payment: saved, confirmationToken };
    } else {
      const confirmationUrl = yokassaPayment.confirmation?.confirmation_url;
      if (!confirmationUrl) {
        this.logger.error(
          `ЮKassa: нет confirmation_url: ${JSON.stringify(yokassaPayment)}`,
        );
        throw new BadRequestException('ЮKassa: не получена ссылка на оплату');
      }
      return { payment: saved, confirmationUrl };
    }
  }

  async handleYokassaWebhook(body: any): Promise<void> {
    if (body.event !== 'payment.succeeded') return;

    const yokassaId = body.object?.id;

    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { externalId: yokassaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment || payment.status === PaymentStatus.PAID) return;

      payment.status = PaymentStatus.PAID;
      await manager.save(payment);

      const subscription = await this.subscriptionService.createSubscription(
        payment.userId,
        payment.planId,
      );
      payment.subscriptionId = subscription.id;
      await manager.save(payment);

      if (payment.promoCodeId) {
        await this.promoService.applyPromo(payment.promoCodeId, payment.userId);
      }
      if (payment.personalDiscountId) {
        await this.promoService.applyPersonalDiscount(
          payment.personalDiscountId,
        );
      }

      this.logger.log(
        `Оплата ЮKassa #${payment.id} подтверждена, подписка #${subscription.id}`,
      );

      this.sendPaymentNotification(
        payment.userId,
        payment.planId,
        subscription.id,
      );
    });
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }

  private async sendPaymentNotification(
    userId: number,
    planId: number,
    subscriptionId: number,
  ): Promise<void> {
    try {
      const user = await this.dataSource
        .getRepository(User)
        .findOne({ where: { id: userId } });
      const plan = await this.dataSource
        .getRepository(Plan)
        .findOne({ where: { id: planId } });
      if (!user || !plan) return;

      const sub = await this.subscriptionService.getActiveSubscription(userId);
      const expiresDate = sub
        ? new Date(sub.expiresAt).toLocaleDateString('ru-RU')
        : 'N/A';
      await this.botService.sendNotification(
        user.telegramId,
        messages.paymentSuccessNotification(plan.name, expiresDate),
      );

      // Notify admin about payment
      const payment = await this.paymentRepo.findOne({
        where: { subscriptionId },
      });
      const userName = user.firstName || user.username || `User #${userId}`;
      this.adminNotify
        .newPayment(
          userName,
          payment?.amount || 0,
          payment?.method || 'unknown',
          plan.name,
        )
        .catch(() => {});
    } catch (e) {
      this.logger.error(`Ошибка уведомления об оплате: ${e}`);
    }
  }

  private async resolveDiscount(
    userId: number,
    amount: number,
    promoCode?: string,
  ): Promise<{
    discountPercent: number;
    promoCodeId?: number;
    personalDiscountId?: number;
    finalAmount: number;
  }> {
    // Personal discount takes priority over promo code
    const personalDiscount = await this.promoService.getActiveDiscount(userId);
    if (personalDiscount && personalDiscount.discountPercent > 0) {
      const finalAmount = Math.max(
        1,
        Math.round(amount * (1 - personalDiscount.discountPercent / 100)),
      );
      return {
        discountPercent: personalDiscount.discountPercent,
        personalDiscountId: personalDiscount.id,
        finalAmount,
      };
    }

    // Fall back to promo code
    if (promoCode) {
      const result = await this.promoService.validatePromo(promoCode, userId);
      if (result.valid && result.promo && result.promo.discountPercent > 0) {
        const finalAmount = Math.max(
          1,
          Math.round(amount * (1 - result.promo.discountPercent / 100)),
        );
        return {
          discountPercent: result.promo.discountPercent,
          promoCodeId: result.promo.id,
          finalAmount,
        };
      }
    }

    return { discountPercent: 0, finalAmount: amount };
  }
}
