import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.appointmentsService.findAllByTenant(tenantId);
  }

  // CORREÇÃO: Agora recebe o nome de quem cancelou
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('nome') nome: string) {
    return this.appointmentsService.cancel(id, nome);
  }
}