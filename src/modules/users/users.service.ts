import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  
  // Atualizar Senha
  async updatePassword(id: string, novaSenha: string) {
    return await prisma.usuario.update({
      where: { id },
      data: { senha: novaSenha }
    });
  }

  // --- NOVO: Atualizar Perfil Completo ---
  async updateProfile(id: string, data: any) {
    return await prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        bio: data.bio,
        instagram: data.instagram,
        // Atualiza os serviços que ele faz (limpa e reconecta)
        servicosQueAtende: data.servicosIds ? {
            set: data.servicosIds.map((id: string) => ({ id }))
        } : undefined
      }
    });
  }
  // --------------------------------------

  // Buscar dados do usuário (incluindo serviços que ele faz)
  async findOne(id: string) {
    return await prisma.usuario.findUnique({
      where: { id },
      include: {
        servicosQueAtende: true // Traz a lista de especialidades
      }
    });
  }
}