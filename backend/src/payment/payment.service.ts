import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { ConfigService } from '@nestjs/config';
import { PromoService } from '../promo/promo.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
    private readonly promoService: PromoService,
    private readonly dataSource: DataSource,
  ) {}

  async createStarsPayment(
    userId: number,
    planId: number,
    amount: number,
    promoCode?: string,
  ): Promise<Payment> {
    let discountPercent = 0;
    let promoCodeId: number | undefined;
    let finalAmount = amount;

    if (promoCode) {
      const result = await this.promoService.validatePromo(promoCode, userId);
      if (result.valid && result.promo) {
        discountPercent = result.promo.discountPercent;
        promoCodeId = result.promo.id;
        if (discountPercent > 0) {
          finalAmount = Math.max(1, Math.round(amount * (1 - discountPercent / 100)));
        }
      }
    }

    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount: finalAmount,
      method: PaymentMethod.STARS,
      status: PaymentStatus.PENDING,
      discountPercent,
      promoCodeId,
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

      this.logger.log(`Оплата Stars #${payment.id} подтверждена, подписка #${subscription.id}`);
      return payment;
    });
  }

  async createYokassaPayment(
    userId: number,
    planId: number,
    amount: number,
    options?: { embedded?: boolean; promoCode?: string },
  ): Promise<{ payment: Payment; confirmationToken?: string; confirmationUrl?: string }> {
    const shopId = this.configService.get<string>('YOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOKASSA_SECRET_KEY');
    const returnUrl = this.configService.get<string>('YOKASSA_RETURN_URL');

    if (!shopId || !secretKey) {
      throw new BadRequestException('ЮKassa не настроена');
    }

    const embedded = options?.embedded ?? false;

    let discountPercent = 0;
    let promoCodeId: number | undefined;
    let finalAmount = amount;

    if (options?.promoCode) {
      const result = await this.promoService.validatePromo(options.promoCode, userId);
      if (result.valid && result.promo) {
        discountPercent = result.promo.discountPercent;
        promoCodeId = result.promo.id;
        if (discountPercent > 0) {
          finalAmount = Math.max(1, Math.round(amount * (1 - discountPercent / 100)));
        }
      }
    }

    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount: finalAmount,
      method: PaymentMethod.YOKASSA,
      status: PaymentStatus.PENDING,
      discountPercent,
      promoCodeId,
    });
    const saved = await this.paymentRepo.save(payment);

    const confirmation = embedded
      ? { type: 'embedded' }
      : { type: 'redirect', return_url: returnUrl || 'https://t.me' };

    const idempotencyKey = `vpn_${saved.id}_${Date.now()}`;
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
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
      throw new BadRequestException(`ЮKassa: ${yokassaPayment.description || 'Ошибка создания платежа'}`);
    }

    saved.externalId = yokassaPayment.id;
    await this.paymentRepo.save(saved);

    if (embedded) {
      const confirmationToken = yokassaPayment.confirmation?.confirmation_token;
      if (!confirmationToken) {
        this.logger.error(`ЮKassa: нет confirmation_token: ${JSON.stringify(yokassaPayment)}`);
        throw new BadRequestException('ЮKassa: не получен токен оплаты');
      }
      return { payment: saved, confirmationToken };
    } else {
      const confirmationUrl = yokassaPayment.confirmation?.confirmation_url;
      if (!confirmationUrl) {
        this.logger.error(`ЮKassa: нет confirmation_url: ${JSON.stringify(yokassaPayment)}`);
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

      this.logger.log(`Оплата ЮKassa #${payment.id} подтверждена, подписка #${subscription.id}`);
    });
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }
}
