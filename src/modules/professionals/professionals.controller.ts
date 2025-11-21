import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  create(@Body() data: any) {
    return this.professionalsService.create(data);
  }

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.professionalsService.findAllByTenant(tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.professionalsService.remove(id);
  }
}