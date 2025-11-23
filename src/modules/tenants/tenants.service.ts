import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TenantsService {
  
  // Listar TODOS os salões
  async findAll() {
    return await prisma.tenant.findMany({
      include: {
        _count: {
          select: { usuarios: true, agendamentos: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Bloquear ou Desbloquear
  async toggleStatus(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    
    // --- CORREÇÃO DE SEGURANÇA ---
    if (!tenant) {
        throw new BadRequestException('Salão não encontrado.');
    }
    // -----------------------------

    return await prisma.tenant.update({
      where: { id },
      data: { ativo: !tenant.ativo } 
    });
  }

  async findOne(id: string) {
    return await prisma.tenant.findUnique({ where: { id } });
  }
}