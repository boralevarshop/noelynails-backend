import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ServicesService {
  
  // Criar um novo serviço
  async create(data: any) {
    const preco = parseFloat(data.preco);
    const duracao = parseInt(data.duracaoMin);
    const diasRetorno = data.diasRetorno ? parseInt(data.diasRetorno) : 30;

    return await prisma.servico.create({
      data: {
        nome: data.nome,
        preco: preco,
        duracaoMin: duracao,
        diasRetorno: diasRetorno,
        tenantId: data.tenantId,
      },
    });
  }

  // Listar todos
  async findAllByTenant(tenantId: string) {
    return await prisma.servico.findMany({
      where: {
        tenantId: tenantId,
        ativo: true,
      },
      orderBy: { nome: 'asc' }
    });
  }

  // --- NOVO: ATUALIZAR SERVIÇO ---
  async update(id: string, data: any) {
    const updateData: any = {
        nome: data.nome,
    };

    if (data.preco) updateData.preco = parseFloat(data.preco);
    if (data.duracaoMin) updateData.duracaoMin = parseInt(data.duracaoMin);
    if (data.diasRetorno) updateData.diasRetorno = parseInt(data.diasRetorno);

    return await prisma.servico.update({
      where: { id },
      data: updateData
    });
  }
  // ------------------------------

  // Deletar (Desativar)
  async remove(id: string) {
    return await prisma.servico.update({
      where: { id },
      data: { ativo: false },
    });
  }
}