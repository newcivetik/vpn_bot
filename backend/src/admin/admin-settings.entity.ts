import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admin_settings')
export class AdminSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  totpSecret: string | null;

  @Column({ default: false })
  totpEnabled: boolean;
}
