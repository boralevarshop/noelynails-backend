import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TenantsService {
  
  async findAll() {
    return await prisma.tenant.findMany({
      include: {
        _count: {
          select: { usuarios: true, agendamentos: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async toggleStatus(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new BadRequestException('Salão não encontrado.');
    
    return await prisma.tenant.update({
      where: { id },
      data: { ativo: !tenant.ativo } 
    });
  }

  async findOne(id: string) {
    return await prisma.tenant.findUnique({ where: { id } });
  }

  async update(id: string, data: any) {
    return await prisma.tenant.update({
      where: { id },
      data: { ...data }
    });
  }

  // --- NOVO: EXCLUSÃO TOTAL DO SALÃO ---
  async delete(id: string) {
    // 1. Apaga Bloqueios
    await prisma.bloqueio.deleteMany({ where: { tenantId: id } });
    
    // 2. Apaga Agendamentos
    await prisma.agendamento.deleteMany({ where: { tenantId: id } });

    // 3. Apaga Serviços
    await prisma.servico.deleteMany({ where: { tenantId: id } });

    // 4. Apaga Clientes
    await prisma.cliente.deleteMany({ where: { tenantId: id } });

    // 5. Apaga Usuários (Dono e Equipe)
    await prisma.usuario.deleteMany({ where: { tenantId: id } });

    // 6. Finalmente, apaga o Salão
    return await prisma.tenant.delete({
      where: { id }
    });
  }
}