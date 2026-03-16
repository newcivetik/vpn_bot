import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Subscription } from '../subscription/subscription.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'int', comment: 'Цена в рублях' })
  price: number;

  @Column({ type: 'int', comment: 'Цена в Telegram Stars' })
  priceStars: number;

  @Column({ type: 'int', comment: 'Лимит трафика в ГБ (0 = безлимит)' })
  trafficLimitGB: number;

  @Column({ type: 'int', comment: 'Длительность подписки в днях' })
  durationDays: number;

  @Column({ type: 'int', default: 1 })
  maxDevices: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: 'Порядок сортировки' })
  sortOrder: number;

  @Column({ type: 'int', default: 0, comment: 'Скидка на продление (%)' })
  renewalDiscountPercent: number;

  @OneToMany(() => Subscription, (s) => s.plan)
  subscriptions: Subscription[];
}
