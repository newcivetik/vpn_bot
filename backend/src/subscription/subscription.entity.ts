import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Plan } from '../plan/plan.entity';
import { Server } from '../server/server.entity';
import { Payment } from '../payment/payment.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.subscriptions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Plan, (p) => p.subscriptions)
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  @Column()
  planId: number;

  @ManyToOne(() => Server, (s) => s.subscriptions)
  @JoinColumn({ name: 'serverId' })
  server: Server;

  @Column()
  serverId: number;

  @Column({ comment: 'UUID клиента в 3X-UI' })
  vpnClientId: string;

  @Column({ nullable: true, comment: 'Email клиента в 3X-UI (для идентификации)' })
  vpnClientEmail: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  trafficUsedGB: number;

  @Column({ type: 'text', nullable: true, comment: 'Ссылка vless://' })
  connectionLink: string;

  @OneToMany(() => Payment, (p) => p.subscription)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
