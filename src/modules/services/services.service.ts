import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ServicesService {
  
  // Criar um novo serviço
  async create(createServiceDto: any) {
    // Garante que preço e duração sejam números
    const preco = parseFloat(createServiceDto.preco);
    const duracao = parseInt(createServiceDto.duracaoMin);

    return await prisma.servico.create({
      data: {
        nome: createServiceDto.nome,
        preco: preco,
        duracaoMin: duracao,
        tenantId: createServiceDto.tenantId, // Vincula ao salão
      },
    });
  }

  // Listar todos os serviços de um salão específico
  async findAllByTenant(tenantId: string) {
    return await prisma.servico.findMany({
      where: {
        tenantId: tenantId,
        ativo: true,
      },
    });
  }

  // Deletar (Desativar) um serviço
  async remove(id: string) {
    return await prisma.servico.update({
      where: { id },
      data: { ativo: false },
    });
  }
}