import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ServicesService {
  
  // Criar um novo serviço
  async create(createServiceDto: any) {
    // Garante que os números sejam números
    const preco = parseFloat(createServiceDto.preco);
    const duracao = parseInt(createServiceDto.duracaoMin);
    
    // --- CORREÇÃO AQUI ---
    // Pega o valor enviado ou usa 30 se não vier nada
    const diasRetorno = createServiceDto.diasRetorno ? parseInt(createServiceDto.diasRetorno) : 30;
    // ---------------------

    return await prisma.servico.create({
      data: {
        nome: createServiceDto.nome,
        preco: preco,
        duracaoMin: duracao,
        diasRetorno: diasRetorno, // Agora estamos salvando de verdade!
        tenantId: createServiceDto.tenantId,
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
      orderBy: { nome: 'asc' } // Melhoria: Ordenar alfabeticamente
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