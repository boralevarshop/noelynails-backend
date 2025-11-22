import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProfessionalsService {
  
  async create(data: any) {
    const { nome, email, telefone, tenantId } = data;

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      throw new BadRequestException('Este email já está cadastrado no sistema.');
    }

    return await prisma.usuario.create({
      data: {
        nome,
        email,
        telefone,
        senha: '123', 
        role: 'PROFISSIONAL',
        tenantId,
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.usuario.findMany({
      where: {
        tenantId: tenantId,
        role: 'PROFISSIONAL',
      },
    });
  }

  // --- CORREÇÃO: FORÇAR EXCLUSÃO ---
  async remove(id: string) {
    // 1. Apaga todos os agendamentos vinculados a este profissional
    await prisma.agendamento.deleteMany({
        where: { profissionalId: id }
    });

    // 2. Exclui o usuário
    return await prisma.usuario.delete({
      where: { id },
    });
  }
}