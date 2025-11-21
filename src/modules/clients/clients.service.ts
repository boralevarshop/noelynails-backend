import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientsService {
  
  // Busca todos os clientes do salão (ordenados por nome)
  async findAllByTenant(tenantId: string) {
    return await prisma.cliente.findMany({
      where: { tenantId },
      orderBy: { nome: 'asc' },
    });
  }
  
  // (Opcional) Buscar por nome/telefone específico se precisar no futuro
}