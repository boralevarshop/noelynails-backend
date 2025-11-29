import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Criar Cliente
  @Post()
  create(@Body() data: any) {
    return this.clientsService.create(data);
  }

  // Listar por Salão
  @Get('tenant/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.clientsService.findAllByTenant(tenantId);
  }

  // Atualizar
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, data);
  }

  // Deletar
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}