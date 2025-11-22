import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientsService {
  
  async findAllByTenant(tenantId: string) {
    return await prisma.cliente.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' },
    });
  }

  async update(id: string, data: any) {
    if (data.telefone) {
        const existe = await prisma.cliente.findFirst({
            where: { 
                telefone: data.telefone, 
                tenantId: data.tenantId,
                id: { not: id } 
            }
        });
        if (existe) {
            throw new BadRequestException('Já existe outro cliente com este telefone.');
        }
    }

    return await prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email
      }
    });
  }

  // --- CORREÇÃO: FORÇAR EXCLUSÃO ---
  async remove(id: string) {
    // 1. Apaga TODO o histórico de agendamentos desse cliente primeiro
    await prisma.agendamento.deleteMany({
        where: { clienteId: id }
    });

    // 2. Agora o cliente está livre para ser excluído
    return await prisma.cliente.delete({
      where: { id }
    });
  }
}