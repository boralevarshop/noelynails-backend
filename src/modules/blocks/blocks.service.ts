import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class BlocksService {
  
  // Criar bloqueio
  async create(data: any) {
    const { tenantId, profissionalId, inicio, fim, motivo } = data;

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    if (dataFim <= dataInicio) {
        throw new BadRequestException('A data final deve ser maior que a inicial.');
    }

    return await prisma.bloqueio.create({
      data: {
        tenantId,
        profissionalId,
        inicio: dataInicio,
        fim: dataFim,
        motivo
      }
    });
  }

  // Listar bloqueios de um profissional (para mostrar na tela dele)
  async findAllByProfessional(profissionalId: string) {
    return await prisma.bloqueio.findMany({
      where: { profissionalId },
      orderBy: { inicio: 'asc' }
    });
  }

  // Listar bloqueios do salão (para o dono ver)
  async findAllByTenant(tenantId: string) {
      return await prisma.bloqueio.findMany({
          where: { tenantId },
          include: { profissional: true },
          orderBy: { inicio: 'asc' }
      });
  }

  // Remover bloqueio (Desbloquear a agenda)
  async remove(id: string) {
    return await prisma.bloqueio.delete({
      where: { id }
    });
  }
}