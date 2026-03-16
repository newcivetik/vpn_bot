import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode } from './promo.entity';
import { PromoUsage } from './promo-usage.entity';

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoUsage)
    private readonly usageRepo: Repository<PromoUsage>,
  ) {}

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
    await this.usageRepo.save({ userId, promoCodeId: promoId });
    await this.promoRepo.increment({ id: promoId }, 'currentUses', 1);
  }

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoRepo.findOne({ where: { code: code.toUpperCase() } });
  }

  async findById(id: number): Promise<PromoCode | null> {
    return this.promoRepo.findOne({ where: { id } });
  }
}
