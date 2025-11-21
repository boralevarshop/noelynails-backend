import { Controller, Get, Param } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.clientsService.findAllByTenant(tenantId);
  }
}