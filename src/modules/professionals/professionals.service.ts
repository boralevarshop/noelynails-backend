import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client'; // Importe o Role do Prisma

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

  // --- CORREÇÃO AQUI ---
  async findAllByTenant(tenantId: string) {
    return await prisma.usuario.findMany({
      where: {
        tenantId: tenantId,
        // Aceita tanto PROFISSIONAL quanto DONO_SALAO na lista
        role: { in: [Role.PROFISSIONAL, Role.DONO_SALAO] } 
      },
      orderBy: { nome: 'asc' } // Ordena alfabeticamente para ficar bonito
    });
  }
  // ---------------------

  async remove(id: string) {
    await prisma.agendamento.deleteMany({
        where: { profissionalId: id }
    });

    return await prisma.usuario.delete({
      where: { id },
    });
  }
}