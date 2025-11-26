import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() data: any) {
    return this.appointmentsService.create(data);
  }

  // --- ROTA DE DISPONIBILIDADE (CRUCIAL PARA A AGENDA PÚBLICA) ---
  @Get('availability')
  getAvailability(
    @Query('tenantId') tenantId: string,
    @Query('professionalId') professionalId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string
  ) {
    // Chama a calculadora no Service
    return this.appointmentsService.getAvailableSlots(tenantId, professionalId, date, serviceId);
  }
  // -----------------------------------------------------------------

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string, @Query('date') date?: string) {
    return this.appointmentsService.findAllByTenant(tenantId, date);
  }

  @Get('retention/:tenantId')
  findRetention(@Param('tenantId') tenantId: string) {
    return this.appointmentsService.findRetentionCandidates(tenantId);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body('nome') nome: string) {
    return this.appointmentsService.cancel(id, nome);
  }
}