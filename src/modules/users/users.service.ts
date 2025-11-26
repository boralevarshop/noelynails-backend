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

  // Atualizar Perfil Completo (Dados, Serviços e Horários)
  async updateProfile(id: string, data: any) {
    return await prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        bio: data.bio,
        instagram: data.instagram,
        avatarUrl: data.avatarUrl,
        
        // --- CAMPO NOVO: CONTROLE DE VISIBILIDADE ---
        aparecerNoSite: data.aparecerNoSite, // Aceita true ou false
        // --------------------------------------------

        // Atualiza Horários de Trabalho (JSON)
        horarios: data.horarios,

        // Atualiza os serviços que ele faz (limpa os antigos e conecta os novos)
        servicosQueAtende: data.servicosIds ? {
            set: data.servicosIds.map((servicoId: string) => ({ id: servicoId }))
        } : undefined
      }
    });
  }

  // Buscar dados do usuário
  async findOne(id: string) {
    return await prisma.usuario.findUnique({
      where: { id },
      include: {
        servicosQueAtende: true // Traz a lista de especialidades
      }
    });
  }
}