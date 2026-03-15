import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('yokassa/webhook')
  async yokassaWebhook(@Body() body: any, @Res() res: any) {
    await this.paymentService.handleYokassaWebhook(body);
    return res.status(200).send('OK');
  }
}
