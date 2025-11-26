import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  create(@Body() data: any) {
    return this.professionalsService.create(data);
  }

  // --- ATUALIZADO: Aceita filtro por serviço (?serviceId=...) ---
  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string, @Query('serviceId') serviceId?: string) {
    return this.professionalsService.findAllByTenant(tenantId, serviceId);
  }
  // -------------------------------------------------------------

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.professionalsService.remove(id);
  }
}