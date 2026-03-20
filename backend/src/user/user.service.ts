import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { telegramId } });
  }

  async findOrCreate(data: {
    telegramId: number;
    username?: string;
    firstName?: string;
    languageCode?: string;
  }): Promise<User & { isNew?: boolean }> {
    let user = await this.findByTelegramId(data.telegramId);
    if (!user) {
      user = this.userRepo.create(data);
      user = await this.userRepo.save(user);
      return Object.assign(user, { isNew: true });
    } else {
      // Обновляем данные при каждом входе
      if (data.username) user.username = data.username;
      if (data.firstName) user.firstName = data.firstName;
      user = await this.userRepo.save(user);
      return Object.assign(user, { isNew: false });
    }
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async generateReferralCode(userId: number): Promise<string> {
    const user = await this.findById(userId);
    if (!user) throw new Error('Пользователь не найден');

    if (user.referralCode) return user.referralCode;

    // Retry loop for uniqueness
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.createRandomCode(8);
      const existing = await this.findByReferralCode(code);
      if (!existing) {
        user.referralCode = code;
        await this.userRepo.save(user);
        return code;
      }
    }
    throw new Error('Не удалось сгенерировать уникальный реферальный код');
  }

  async findByReferralCode(code: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { referralCode: code } });
  }

  async getReferralCount(userId: number): Promise<number> {
    return this.userRepo.count({ where: { referrerId: userId } });
  }

  async addReferralBonus(userId: number, days: number): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'referralBonusDays', days);
  }

  async updateNotifyPreference(
    userId: number,
    enabled: boolean,
  ): Promise<void> {
    await this.userRepo.update(userId, { notifyBeforeExpiry: enabled });
  }

  async setReferrer(userId: number, referrerId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user || user.referrerId) return;
    if (userId === referrerId) return;

    user.referrerId = referrerId;
    await this.userRepo.save(user);
  }

  private createRandomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
