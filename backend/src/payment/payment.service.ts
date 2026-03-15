import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createStarsPayment(
    userId: number,
    planId: number,
    amount: number,
  ): Promise<Payment> {
    const payment = this.paymentRepo.create({
      userId,
      planId,
      amount,
      method: PaymentMethod.STARS,
      status: PaymentStatus.PENDING,
    });
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

    // Создаём подписку
    const subscription = await this.subscriptionService.createSubscription(
      payment.userId,
      payment.planId,
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
  ): Promise<{ payment: Payment; confirmationUrl: string }> {
    const shopId = process.env.YOKASSA_SHOP_ID;
    const secretKey = process.env.YOKASSA_SECRET_KEY;
    const returnUrl = process.env.YOKASSA_RETURN_URL;

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
    const saved = await this.paymentRepo.save(payment);

    // Создаём платёж в ЮKassa
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
        confirmation: { type: 'redirect', return_url: returnUrl || 'https://t.me' },
        capture: true,
        description: `VPN подписка #${saved.id}`,
        metadata: { paymentId: saved.id },
      }),
    });

    const yokassaPayment = await res.json();
    saved.externalId = yokassaPayment.id;
    await this.paymentRepo.save(saved);

    return {
      payment: saved,
      confirmationUrl: yokassaPayment.confirmation?.confirmation_url || '',
    };
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

    const subscription = await this.subscriptionService.createSubscription(
      payment.userId,
      payment.planId,
    );
    payment.subscriptionId = subscription.id;
    await this.paymentRepo.save(payment);

    this.logger.log(`Оплата ЮKassa #${payment.id} подтверждена, подписка #${subscription.id}`);
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentRepo.findOne({ where: { id } });
  }
}
