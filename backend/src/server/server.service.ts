import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from './server.entity';

@Injectable()
export class ServerService {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
  ) {}

  async findAvailable(): Promise<Server | null> {
    return this.serverRepo.findOne({
      where: { isActive: true },
      order: { currentClients: 'ASC' },
    });
  }

  async findById(id: number): Promise<Server | null> {
    return this.serverRepo.findOne({ where: { id } });
  }

  async findAll(): Promise<Server[]> {
    return this.serverRepo.find({ order: { id: 'ASC' } });
  }

  async incrementClients(id: number): Promise<void> {
    await this.serverRepo.increment({ id }, 'currentClients', 1);
  }

  async decrementClients(id: number): Promise<void> {
    await this.serverRepo.decrement({ id }, 'currentClients', 1);
  }
}
