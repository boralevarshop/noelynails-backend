import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  
  // Atualizar apenas a senha do usuário
  async updatePassword(id: string, novaSenha: string) {
    // Em um sistema final, aqui usaríamos bcrypt para criptografar
    return await prisma.usuario.update({
      where: { id },
      data: { senha: novaSenha }
    });
  }

  // Buscar dados do usuário (útil para confirmar quem é)
  async findOne(id: string) {
    return await prisma.usuario.findUnique({
      where: { id }
    });
  }
}