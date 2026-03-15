import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Subscription } from '../subscription/subscription.entity';

@Entity('servers')
export class Server {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ comment: 'IP или домен сервера 3X-UI' })
  host: string;

  @Column({ type: 'int', default: 443, comment: 'Порт VLESS' })
  port: number;

  @Column({ type: 'int', default: 2096, comment: 'Порт панели 3X-UI' })
  apiPort: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ type: 'int', default: 1, comment: 'ID inbound в 3X-UI' })
  inboundId: number;

  @Column({ default: 'Нидерланды' })
  location: string;

  @Column({ type: 'int', default: 100 })
  maxClients: number;

  @Column({ type: 'int', default: 0 })
  currentClients: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Subscription, (s) => s.server)
  subscriptions: Subscription[];
}
