import {
  Controller,
  Post,
  Req,
  Res,
  ForbiddenException,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { webhookCallback } from 'grammy';

@Controller('bot')
export class BotController {
  private readonly webhookSecret: string;

  constructor(
    private readonly botService: BotService,
    private readonly config: ConfigService,
  ) {
    this.webhookSecret = this.config.get<string>('WEBHOOK_SECRET') || '';
  }

  @Post('webhook')
  async webhook(
    @Req() req: any,
    @Res() res: any,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    if (this.webhookSecret && secretToken !== this.webhookSecret) {
      throw new ForbiddenException('Invalid webhook secret');
    }
    const handler = webhookCallback(this.botService.getBot(), 'express');
    return handler(req, res);
  }
}
