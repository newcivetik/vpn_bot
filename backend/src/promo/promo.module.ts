import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './promo.entity';
import { PromoUsage } from './promo-usage.entity';
import { PromoService } from './promo.service';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCode, PromoUsage])],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
