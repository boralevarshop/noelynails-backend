import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientsService {
  
  async create(data: any) {
    // 1. Verifica duplicidade de Telefone
    const telefoneExiste = await prisma.cliente.findFirst({
        where: { 
            tenantId: data.tenantId, 
            telefone: data.telefone 
        }
    });
    if (telefoneExiste) {
        throw new BadRequestException('Este WhatsApp já está cadastrado para outro cliente.');
    }

    // 2. Verifica duplicidade de Nome (Opcional, mas solicitado)
    const nomeExiste = await prisma.cliente.findFirst({
        where: { 
            tenantId: data.tenantId, 
            nome: { equals: data.nome, mode: 'insensitive' } // Ignora maiúsculas/minúsculas
        }
    });
    if (nomeExiste) {
        throw new BadRequestException(`Já existe um cliente chamado "${data.nome}". Adicione um sobrenome para diferenciar.`);
    }

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
      include: {
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          include: { servico: true, profissional: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
  }

  async findOne(id: string) {
    return await prisma.cliente.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    // Verifica se o cliente existe
    const clienteAtual = await prisma.cliente.findUnique({ where: { id } });
    if (!clienteAtual) throw new BadRequestException('Cliente não encontrado.');

    // 1. Se mudou o telefone, verifica se o novo já existe
    if (data.telefone && data.telefone !== clienteAtual.telefone) {
        const telefoneExiste = await prisma.cliente.findFirst({
            where: { 
                tenantId: data.tenantId, 
                telefone: data.telefone,
                id: { not: id } // Ignora o próprio cliente
            }
        });
        if (telefoneExiste) throw new BadRequestException('Este WhatsApp já pertence a outro cliente.');
    }

    // 2. Se mudou o nome, verifica duplicidade
    if (data.nome && data.nome !== clienteAtual.nome) {
        const nomeExiste = await prisma.cliente.findFirst({
            where: { 
                tenantId: data.tenantId, 
                nome: { equals: data.nome, mode: 'insensitive' },
                id: { not: id }
            }
        });
        if (nomeExiste) throw new BadRequestException(`O nome "${data.nome}" já está em uso.`);
    }

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