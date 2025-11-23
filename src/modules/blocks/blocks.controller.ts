import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { BlocksService } from './blocks.service';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  create(@Body() data: any) {
    return this.blocksService.create(data);
  }

  @Get('professional/:id')
  findAllByProfessional(@Param('id') id: string) {
    return this.blocksService.findAllByProfessional(id);
  }
  
  @Get('tenant/:id')
  findAllByTenant(@Param('id') id: string) {
      return this.blocksService.findAllByTenant(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blocksService.remove(id);
  }
}