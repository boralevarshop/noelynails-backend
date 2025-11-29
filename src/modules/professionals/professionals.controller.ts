import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  create(@Body() data: any) {
    return this.professionalsService.create(data);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string, @Query('serviceId') serviceId?: string) {
    return this.professionalsService.findAllByTenant(tenantId, serviceId);
  }

  // --- NOVO: ROTA DE EDIÇÃO ---
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.professionalsService.update(id, data);
  }
  // ----------------------------

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.professionalsService.remove(id);
  }
}