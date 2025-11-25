import { Controller, Post, Body } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscribe')
  createSubscription(@Body() body: any) {
    return this.billingService.createSubscription(body.tenantId, body.planoId);
  }
}