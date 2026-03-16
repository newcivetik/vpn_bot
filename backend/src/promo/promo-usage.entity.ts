import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { PromoCode } from './promo.entity';

@Entity('promo_usages')
export class PromoUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => PromoCode, (p) => p.usages)
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  @Column()
  promoCodeId: number;

  @CreateDateColumn()
  usedAt: Date;
}
