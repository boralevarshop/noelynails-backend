import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // --- O QUE FALTAVA ESTÁ AQUI ---
  @Post()
  create(@Body() data: any) {
    return this.clientsService.create(data);
  }
  // ------------------------------

  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.clientsService.findAllByTenant(tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}