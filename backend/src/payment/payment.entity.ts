import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Subscription } from '../subscription/subscription.entity';

export enum PaymentMethod {
  STARS = 'stars',
  YOKASSA = 'yokassa',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.payments)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Subscription, (s) => s.payments, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;

  @Column({ nullable: true })
  subscriptionId: number;

  @Column({ type: 'int', comment: 'Сумма в рублях или Stars' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true, comment: 'ID платежа во внешней системе' })
  externalId: string;

  @Column({ nullable: true, comment: 'ID тарифа для привязки после оплаты' })
  planId: number;

  @CreateDateColumn()
  createdAt: Date;
}
