import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

interface DefaultSetting {
  key: string;
  value: string;
  description: string;
}

const DEFAULT_SETTINGS: DefaultSetting[] = [
  { key: 'referral_bonus_days', value: '3', description: 'Бонусных дней рефереру' },
  { key: 'referred_bonus_days', value: '1', description: 'Бонусных дней приглашённому' },
  { key: 'trial_days', value: '1', description: 'Длительность пробного периода (дни)' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {}

  async onModuleInit() {
    for (const def of DEFAULT_SETTINGS) {
      const existing = await this.settingRepo.findOne({ where: { key: def.key } });
      if (!existing) {
        await this.settingRepo.save(this.settingRepo.create(def));
        this.logger.log(`Seeded default setting: ${def.key} = ${def.value}`);
      }
    }
  }

  async get(key: string, defaultValue: string): Promise<string> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting?.value ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const value = await this.get(key, String(defaultValue));
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    const existing = await this.settingRepo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      if (description !== undefined) {
        existing.description = description;
      }
      await this.settingRepo.save(existing);
    } else {
      await this.settingRepo.save(this.settingRepo.create({ key, value, description: description ?? undefined }));
    }
  }

  async getAll(): Promise<Setting[]> {
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }
}
