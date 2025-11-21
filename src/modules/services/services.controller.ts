import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Body() createServiceDto: any) {
    return this.servicesService.create(createServiceDto);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.servicesService.findAllByTenant(tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}