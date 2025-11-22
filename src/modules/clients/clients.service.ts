import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientsService {
  
  // Listar todos
  async findAllByTenant(tenantId: string) {
    return await prisma.cliente.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' },
    });
  }

  // Editar Cliente
  async update(id: string, data: any) {
    // Verifica se o telefone novo já existe em outro cliente (para evitar duplicatas)
    if (data.telefone) {
        const existe = await prisma.cliente.findFirst({
            where: { 
                telefone: data.telefone, 
                tenantId: data.tenantId,
                id: { not: id } // Ignora o próprio cliente que está sendo editado
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

  // Excluir Cliente
  async remove(id: string) {
    // Verifica se tem agendamentos
    const agendamentos = await prisma.agendamento.count({
        where: { clienteId: id }
    });

    if (agendamentos > 0) {
        // Opção A: Bloquear exclusão (Mais seguro)
        throw new BadRequestException('Não é possível excluir cliente com agendamentos registrados.');
        
        // Opção B: Se quisesse apagar tudo, usaria deleteMany nos agendamentos antes.
    }

    return await prisma.cliente.delete({
      where: { id }
    });
  }
}