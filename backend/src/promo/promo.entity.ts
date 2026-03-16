import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PromoUsage } from './promo-usage.entity';

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 32 })
  code: string;

  @Column({ type: 'int', default: 0, comment: 'Процент скидки (0-100)' })
  discountPercent: number;

  @Column({ type: 'int', default: 0, comment: 'Бонусные дни к подписке' })
  bonusDays: number;

  @Column({ type: 'int', default: 0, comment: '0 = безлимит' })
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  currentUses: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => PromoUsage, (u) => u.promoCode)
  usages: PromoUsage[];

  @CreateDateColumn()
  createdAt: Date;
}
