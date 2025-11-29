import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, StatusAgendamento } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ServicesService {
  
  async create(data: any) {
    const preco = parseFloat(data.preco);
    const duracao = parseInt(data.duracaoMin);
    const diasRetorno = data.diasRetorno ? parseInt(data.diasRetorno) : 30;

    // 1. Validação de Nome Duplicado
    const nomeExiste = await prisma.servico.findFirst({
        where: {
            tenantId: data.tenantId,
            nome: { equals: data.nome, mode: 'insensitive' },
            ativo: true
        }
    });

    if (nomeExiste) {
        throw new BadRequestException(`Já existe um serviço com o nome "${data.nome}".`);
    }

    return await prisma.servico.create({
      data: {
        nome: data.nome,
        preco: preco,
        duracaoMin: duracao,
        diasRetorno: diasRetorno,
        tenantId: data.tenantId,
        createdById: data.usuarioId, // Quem criou
        updatedById: data.usuarioId  // Quem "mexeu" por último
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.servico.findMany({
      where: { tenantId, ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        createdBy: { select: { nome: true } }, // Traz o nome de quem criou
        updatedBy: { select: { nome: true } }, // Traz o nome de quem editou
        
        // Traz o último agendamento CONCLUÍDO para mostrar no card
        agendamentos: {
            where: { status: StatusAgendamento.CONCLUIDO },
            orderBy: { dataHora: 'desc' },
            take: 1,
            select: { dataHora: true }
        }
      }
    });
  }

  async update(id: string, data: any) {
    // Validação de Nome Duplicado na Edição
    if (data.nome) {
        const nomeExiste = await prisma.servico.findFirst({
            where: {
                tenantId: data.tenantId,
                nome: { equals: data.nome, mode: 'insensitive' },
                id: { not: id }, // Ignora o próprio serviço
                ativo: true
            }
        });
        if (nomeExiste) throw new BadRequestException(`O nome "${data.nome}" já está em uso.`);
    }

    const updateData: any = {
        nome: data.nome,
        updatedById: data.usuarioId // Atualiza quem mexeu
    };

    if (data.preco) updateData.preco = parseFloat(data.preco);
    if (data.duracaoMin) updateData.duracaoMin = parseInt(data.duracaoMin);
    if (data.diasRetorno) updateData.diasRetorno = parseInt(data.diasRetorno);

    return await prisma.servico.update({
      where: { id },
      data: updateData
    });
  }

  async remove(id: string, usuarioId: string) {
    // Soft Delete (apenas desativa) + Marca quem deletou
    return await prisma.servico.update({
      where: { id },
      data: { 
          ativo: false,
          updatedById: usuarioId // Marca quem excluiu
      },
    });
  }
}