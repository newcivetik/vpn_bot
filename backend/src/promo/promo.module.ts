import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './promo.entity';
import { PromoUsage } from './promo-usage.entity';
import { PersonalDiscount } from './personal-discount.entity';
import { PromoService } from './promo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCode, PromoUsage, PersonalDiscount]),
  ],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
