import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientsService {
  
  async create(data: any) {
    return await prisma.cliente.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email,
        tenantId: data.tenantId,
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.cliente.findMany({
      where: { tenantId },
      // Traz os agendamentos para o histórico
      include: {
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          include: { servico: true, profissional: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
  }

  async update(id: string, data: any) {
    return await prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email,
      },
    });
  }

  async remove(id: string) {
    // Limpa histórico antes de deletar
    await prisma.agendamento.deleteMany({ where: { clienteId: id } });
    return await prisma.cliente.delete({ where: { id } });
  }
}