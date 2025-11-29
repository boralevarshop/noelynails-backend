import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
    if (!tenant) throw new NotFoundException('Salão não encontrado.');
    return await prisma.tenant.update({ where: { id }, data: { ativo: !tenant.ativo } });
  }

  async findOne(id: string) {
    return await prisma.tenant.findUnique({ where: { id } });
  }

  // --- BUSCAR POR SLUG ---
  async findBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: {
            id: true, nome: true, slug: true, telefone: true,
            corPrimaria: true, corSecundaria: true, corTerciaria: true, corTexto: true, // Cores
            logoUrl: true, ativo: true, agendamentoOnline: true, segmento: true
        }
    });

    if (!tenant) throw new NotFoundException('Salão não encontrado.');
    if (!tenant.agendamentoOnline) throw new BadRequestException('O agendamento online está desativado.');
    if (!tenant.ativo) throw new BadRequestException('Salão temporariamente indisponível.');

    return tenant;
  }

  // --- ATUALIZAR DADOS ---
  async update(id: string, data: any) {
    if (data.slug) {
        const existe = await prisma.tenant.findUnique({ where: { slug: data.slug } });
        if (existe && existe.id !== id) throw new BadRequestException('Slug em uso.');
    }

    const dadosAtualizar: any = {
        nome: data.nome, slug: data.slug, telefone: data.telefone,
        corPrimaria: data.corPrimaria, corSecundaria: data.corSecundaria, 
        corTerciaria: data.corTerciaria, corTexto: data.corTexto,
        segmento: data.segmento, whatsappInstance: data.whatsappInstance,
        agendamentoOnline: data.agendamentoOnline, plano: data.plano,
        statusAssinatura: data.statusAssinatura, trialFim: data.trialFim,
        asaasCustomerId: data.asaasCustomerId
    };

    Object.keys(dadosAtualizar).forEach(key => 
        dadosAtualizar[key] === undefined && delete dadosAtualizar[key]
    );

    return await prisma.tenant.update({ where: { id }, data: dadosAtualizar });
  }

  async delete(id: string) {
    await prisma.bloqueio.deleteMany({ where: { tenantId: id } });
    await prisma.agendamento.deleteMany({ where: { tenantId: id } });
    await prisma.servico.deleteMany({ where: { tenantId: id } });
    await prisma.cliente.deleteMany({ where: { tenantId: id } });
    await prisma.usuario.deleteMany({ where: { tenantId: id } });
    return await prisma.tenant.delete({ where: { id } });
  }
}