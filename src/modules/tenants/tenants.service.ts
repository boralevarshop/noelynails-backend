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

  // --- ATUALIZAR DADOS DO SALÃO (CORES, NOME, ETC) ---
  async update(id: string, data: any) {
    // Se tentar mudar o slug, verifica se já existe
    if (data.slug) {
        const existe = await prisma.tenant.findUnique({ where: { slug: data.slug } });
        if (existe && existe.id !== id) {
            throw new BadRequestException('Este link já está em uso por outro salão.');
        }
    }

    return await prisma.tenant.update({
      where: { id },
      data: {
        nome: data.nome,
        slug: data.slug,
        telefone: data.telefone,
        corPrimaria: data.corPrimaria,
        corSecundaria: data.corSecundaria,
        whatsappInstance: data.whatsappInstance
      }
    });
  }
  // --------------------------------------------------

  async delete(id: string) {
    await prisma.bloqueio.deleteMany({ where: { tenantId: id } });
    await prisma.agendamento.deleteMany({ where: { tenantId: id } });
    await prisma.servico.deleteMany({ where: { tenantId: id } });
    await prisma.cliente.deleteMany({ where: { tenantId: id } });
    await prisma.usuario.deleteMany({ where: { tenantId: id } });
    return await prisma.tenant.delete({ where: { id } });
  }
}