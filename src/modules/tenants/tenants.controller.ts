import { Controller, Get, Param, Patch, Body, Delete } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.tenantsService.toggleStatus(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.tenantsService.update(id, data);
  }

  // --- NOVA ROTA DELETE ---
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tenantsService.delete(id);
  }
}