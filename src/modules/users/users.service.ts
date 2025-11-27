import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  async updatePassword(id: string, novaSenha: string) {
    return await prisma.usuario.update({ where: { id }, data: { senha: novaSenha } });
  }

  async updateProfile(id: string, data: any) {
    return await prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome, telefone: data.telefone, bio: data.bio,
        instagram: data.instagram, avatarUrl: data.avatarUrl,
        aparecerNoSite: data.aparecerNoSite, horarios: data.horarios,
        servicosQueAtende: data.servicosIds ? {
            set: data.servicosIds.map((servicoId: string) => ({ id: servicoId }))
        } : undefined
      }
    });
  }

  async findOne(id: string) {
    return await prisma.usuario.findUnique({
      where: { id },
      include: { servicosQueAtende: true, tenant: true }
    });
  }
}