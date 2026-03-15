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
  }): Promise<User> {
    let user = await this.findByTelegramId(data.telegramId);
    if (!user) {
      user = this.userRepo.create(data);
      user = await this.userRepo.save(user);
    } else {
      // Обновляем данные при каждом входе
      if (data.username) user.username = data.username;
      if (data.firstName) user.firstName = data.firstName;
      user = await this.userRepo.save(user);
    }
    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}
