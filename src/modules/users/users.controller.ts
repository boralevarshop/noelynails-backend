import { Controller, Patch, Param, Body, Get } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/password')
  updatePassword(@Param('id') id: string, @Body('senha') senha: string) {
    return this.usersService.updatePassword(id, senha);
  }

  // --- NOVA ROTA ---
  @Patch(':id')
  updateProfile(@Param('id') id: string, @Body() data: any) {
    return this.usersService.updateProfile(id, data);
  }
}