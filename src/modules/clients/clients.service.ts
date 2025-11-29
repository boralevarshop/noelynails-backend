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

  // --- ATUALIZADO: TRAZ O HISTÓRICO ---
  async findAllByTenant(tenantId: string) {
    return await prisma.cliente.findMany({
      where: { tenantId },
      include: {
        agendamentos: {
          orderBy: { dataHora: 'desc' }, // Do mais novo pro mais velho
          include: {
            servico: true,
            profissional: true
          }
        }
      },
      orderBy: { nome: 'asc' }
    });
  }
  // ------------------------------------

  async findOne(id: string) {
    return await prisma.cliente.findUnique({ where: { id } });
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
    // Verifica se tem agendamentos antes de deletar
    const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: { _count: { select: { agendamentos: true } } }
    });

    if (cliente && cliente._count.agendamentos > 0) {
        // Opcional: Poderíamos deletar os agendamentos ou impedir.
        // Por segurança, vamos deletar os agendamentos primeiro (Cascata manual)
        await prisma.agendamento.deleteMany({ where: { clienteId: id } });
    }

    return await prisma.cliente.delete({ where: { id } });
  }
}