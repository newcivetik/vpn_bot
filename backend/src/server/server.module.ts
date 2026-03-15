import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Server } from './server.entity';
import { ServerService } from './server.service';

@Module({
  imports: [TypeOrmModule.forFeature([Server])],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
