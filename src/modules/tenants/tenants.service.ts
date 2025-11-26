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

  // Buscar por Slug (Público)
  async findBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: {
            id: true,
            nome: true,
            slug: true,
            telefone: true,
            corPrimaria: true,
            corSecundaria: true,
            logoUrl: true,
            ativo: true,
            agendamentoOnline: true // Retorna se está aberto para agendamento
        }
    });

    if (!tenant) throw new BadRequestException('Salão não encontrado.');
    if (!tenant.ativo) throw new BadRequestException('Este salão está temporariamente indisponível.');

    return tenant;
  }

  // Atualizar dados do salão
  async update(id: string, data: any) {
    if (data.slug) {
        const existe = await prisma.tenant.findUnique({ where: { slug: data.slug } });
        if (existe && existe.id !== id) {
            throw new BadRequestException('Este link já está em uso por outro salão.');
        }
    }

    const dadosAtualizar: any = {
        nome: data.nome,
        slug: data.slug,
        telefone: data.telefone,
        corPrimaria: data.corPrimaria,
        corSecundaria: data.corSecundaria,
        whatsappInstance: data.whatsappInstance,
        
        // Campos Financeiros
        plano: data.plano,
        statusAssinatura: data.statusAssinatura,
        trialFim: data.trialFim,
        asaasCustomerId: data.asaasCustomerId,

        // --- CAMPO NOVO ADICIONADO ---
        agendamentoOnline: data.agendamentoOnline 
        // -----------------------------
    };

    // Limpa campos undefined
    Object.keys(dadosAtualizar).forEach(key => 
        dadosAtualizar[key] === undefined && delete dadosAtualizar[key]
    );

    return await prisma.tenant.update({
      where: { id },
      data: dadosAtualizar
    });
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