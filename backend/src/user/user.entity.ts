import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscription } from '../subscription/subscription.entity';
import { Payment } from '../payment/payment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  telegramId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  languageCode: string;

  @Column({ nullable: true, comment: 'ID реферера' })
  referrerId: number;

  @Column({ nullable: true, unique: true, length: 8, comment: 'Реферальный код' })
  referralCode: string;

  @Column({ type: 'int', default: 0, comment: 'Накопленные бонусные дни от рефералов' })
  referralBonusDays: number;

  @Column({ default: true })
  notifyBeforeExpiry: boolean;

  @OneToMany(() => Subscription, (s) => s.user)
  subscriptions: Subscription[];

  @OneToMany(() => Payment, (p) => p.user)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
