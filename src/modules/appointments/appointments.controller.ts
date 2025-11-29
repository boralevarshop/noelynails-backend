import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  // Rota de Disponibilidade (Pública)
  @Get('availability')
  getAvailability(
    @Query('tenantId') tenantId: string,
    @Query('professionalId') professionalId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string
  ) {
    return this.appointmentsService.getAvailableSlots(tenantId, professionalId, date, serviceId);
  }

  // --- ATUALIZADO: Aceita range de datas (start/end) ---
  @Get('tenant/:tenantId')
  findAll(
      @Param('tenantId') tenantId: string, 
      @Query('date') date?: string,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string
  ) {
    return this.appointmentsService.findAllByTenant(tenantId, date, startDate, endDate);
  }
  // -----------------------------------------------------

  @Get('retention/:tenantId')
  findRetention(@Param('tenantId') tenantId: string) {
    return this.appointmentsService.findRetentionCandidates(tenantId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('nome') nome: string) {
    return this.appointmentsService.cancel(id, nome);
  }
}