import { Controller, Post, Req, Res } from '@nestjs/common';
import { BotService } from './bot.service';
import { webhookCallback } from 'grammy';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('webhook')
  async webhook(@Req() req: any, @Res() res: any) {
    const handler = webhookCallback(this.botService.getBot(), 'express');
    return handler(req, res);
  }
}
