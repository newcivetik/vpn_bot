import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';

const DEFAULT_PLANS: Partial<Plan>[] = [
  {
    name: 'Базовый',
    slug: 'basic',
    price: 150,
    priceStars: 75,
    trafficLimitGB: 100,
    durationDays: 30,
    maxDevices: 1,
    sortOrder: 1,
  },
  {
    name: 'Стандарт',
    slug: 'standard',
    price: 250,
    priceStars: 125,
    trafficLimitGB: 0, // безлимит
    durationDays: 30,
    maxDevices: 2,
    sortOrder: 2,
  },
  {
    name: 'Семейный',
    slug: 'family',
    price: 400,
    priceStars: 200,
    trafficLimitGB: 0,
    durationDays: 30,
    maxDevices: 5,
    sortOrder: 3,
  },
];

@Injectable()
export class PlanService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async onModuleInit() {
    const count = await this.planRepo.count();
    if (count === 0) {
      for (const plan of DEFAULT_PLANS) {
        await this.planRepo.save(this.planRepo.create(plan));
      }
    }
  }

  async findAll(): Promise<Plan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: number): Promise<Plan | null> {
    return this.planRepo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    return this.planRepo.findOne({ where: { slug } });
  }
}
