import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PromoCode } from './promo.entity';
import { PromoUsage } from './promo-usage.entity';

@Injectable()
export class PromoService implements OnModuleInit {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoUsage)
    private readonly usageRepo: Repository<PromoUsage>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const existing = await this.promoRepo.findOne({
      where: { code: 'RENEW15' },
    });
    if (!existing) {
      await this.promoRepo.save(
        this.promoRepo.create({
          code: 'RENEW15',
          discountPercent: 15,
          bonusDays: 0,
          maxUses: 0, // unlimited
          isActive: true,
        }),
      );
      this.logger.log('Промокод RENEW15 создан (15% скидка)');
    }
  }

  async validatePromo(
    code: string,
    userId: number,
  ): Promise<{ valid: boolean; promo?: PromoCode; error?: string }> {
    const promo = await this.promoRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!promo) {
      return { valid: false, error: 'Промокод не найден' };
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { valid: false, error: 'Промокод истёк' };
    }

    if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
      return { valid: false, error: 'Промокод исчерпан' };
    }

    const alreadyUsed = await this.usageRepo.findOne({
      where: { userId, promoCodeId: promo.id },
    });
    if (alreadyUsed) {
      return { valid: false, error: 'Ты уже использовал этот промокод' };
    }

    return { valid: true, promo };
  }

  async applyPromo(promoId: number, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Lock the promo code row to prevent race conditions
      const promo = await manager.findOne(PromoCode, {
        where: { id: promoId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!promo) throw new BadRequestException('Промокод не найден');

      if (promo.maxUses > 0 && promo.currentUses >= promo.maxUses) {
        throw new BadRequestException('Промокод исчерпан');
      }

      // Check if already used within transaction
      const alreadyUsed = await manager.findOne(PromoUsage, {
        where: { userId, promoCodeId: promoId },
      });
      if (alreadyUsed) return;

      await manager.save(PromoUsage, { userId, promoCodeId: promoId });
      promo.currentUses += 1;
      await manager.save(promo);
    });
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoRepo.findOne({ where: { code: code.toUpperCase() } });
  }
}
