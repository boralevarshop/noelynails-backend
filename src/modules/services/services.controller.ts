import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Body() data: any) {
    return this.servicesService.create(data);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.servicesService.findAllByTenant(tenantId);
  }

  // --- NOVA ROTA DE EDIÇÃO ---
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.servicesService.update(id, data);
  }
  // ---------------------------

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}