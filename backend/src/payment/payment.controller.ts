import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';

// YooKassa webhook IPs: https://yookassa.ru/developers/using-api/webhooks
const YOKASSA_IPS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
  '2a02:5180::/32',
];

function ipInCIDR(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip
    .split('.')
    .reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  const rangeNum = range
    .split('.')
    .reduce((acc, oct) => (acc << 8) + parseInt(oct), 0);
  return (ipNum & mask) === (rangeNum & mask);
}

function isYokassaIP(ip: string): boolean {
  // Skip IPv6 check for simplicity, allow if starts with 2a02:5180
  if (ip.includes(':')) return ip.startsWith('2a02:5180');
  const cleanIp = ip.replace('::ffff:', '');
  return YOKASSA_IPS.some((cidr) => ipInCIDR(cleanIp, cidr));
}

@Controller('api/payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('yokassa/webhook')
  async yokassaWebhook(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';

    if (process.env.NODE_ENV === 'production' && !isYokassaIP(clientIp)) {
      this.logger.warn(`YooKassa webhook rejected: untrusted IP ${clientIp}`);
      throw new ForbiddenException('Untrusted IP');
    }

    try {
      await this.paymentService.handleYokassaWebhook(body);
      return res.status(200).send('OK');
    } catch (e) {
      this.logger.error(`YooKassa webhook processing error: ${e}`);
      return res.status(500).send('Internal Error');
    }
  }
}
