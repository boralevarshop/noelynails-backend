import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  // Rota de busca diária (Resumo) e geral
  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string, @Query('date') date?: string) {
    return this.appointmentsService.findAllByTenant(tenantId, date);
  }

  // Rota de Retenção (Agora sem parâmetro de dias, pois é automático)
  @Get('retention/:tenantId')
  findRetention(@Param('tenantId') tenantId: string) {
    return this.appointmentsService.findRetentionCandidates(tenantId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('nome') nome: string) {
    return this.appointmentsService.cancel(id, nome);
  }
}