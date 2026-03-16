import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;
}
