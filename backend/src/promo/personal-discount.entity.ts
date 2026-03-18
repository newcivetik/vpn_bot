import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('personal_discounts')
export class PersonalDiscount {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'int', default: 0, comment: 'Процент скидки (0-100)' })
  discountPercent: number;

  @Column({ type: 'int', default: 0, comment: 'Бонусные дни к подписке' })
  bonusDays: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Причина скидки' })
  reason: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
