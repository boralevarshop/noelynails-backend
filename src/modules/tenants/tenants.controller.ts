import { Controller, Get, Param, Patch } from '@nestjs/common';
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

  // Rota para bloquear/desbloquear: PATCH /tenants/ID/toggle
  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.tenantsService.toggleStatus(id);
  }
}