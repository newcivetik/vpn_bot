import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './plan.entity';
import { PlanService } from './plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
