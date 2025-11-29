import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProfessionalsService {
  
  async create(data: any) {
    const { nome, email, telefone, tenantId } = data;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Salão não encontrado.');
    
    const totalProfissionais = await prisma.usuario.count({
        where: { tenantId, role: 'PROFISSIONAL' }
    });

    // Limites do Plano
    let limite = 1; 
    if (tenant.plano === 'PRIME') limite = 4;
    if (tenant.plano === 'SUPREME') limite = 999;

    if (totalProfissionais >= limite) {
        throw new BadRequestException(`Seu plano ${tenant.plano} permite apenas ${limite} profissionais.`);
    }

    // --- VALIDAÇÕES DE DUPLICIDADE ---
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) throw new BadRequestException('Este email já está cadastrado.');

    const telExiste = await prisma.usuario.findFirst({ where: { tenantId, telefone } });
    if (telExiste) throw new BadRequestException('Este telefone já está cadastrado.');

    const nomeExiste = await prisma.usuario.findFirst({ 
        where: { tenantId, nome: { equals: nome, mode: 'insensitive' } } 
    });
    if (nomeExiste) throw new BadRequestException(`Já existe um profissional chamado "${nome}".`);
    // ---------------------------------

    return await prisma.usuario.create({
      data: {
        nome, email, telefone, senha: '123', role: 'PROFISSIONAL', tenantId,
      },
    });
  }

  async findAllByTenant(tenantId: string, serviceId?: string) {
    const whereClause: any = {
      tenantId: tenantId,
      role: { in: [Role.PROFISSIONAL, Role.DONO_SALAO] } 
    };

    if (serviceId) {
        whereClause.servicosQueAtende = { some: { id: serviceId } };
        whereClause.aparecerNoSite = true;
    }

    return await prisma.usuario.findMany({
      where: whereClause,
      // Inclui histórico para o painel do dono
      include: {
        agendamentos: {
            orderBy: { dataHora: 'desc' },
            include: { servico: true, cliente: true }
        }
      },
      orderBy: { nome: 'asc' } 
    });
  }

  // --- ATUALIZAR PROFISSIONAL ---
  async update(id: string, data: any) {
    const current = await prisma.usuario.findUnique({ where: { id } });
    if (!current) throw new BadRequestException('Profissional não encontrado.');

    // Validações na Edição (ignora o próprio ID)
    if (data.email && data.email !== current.email) {
        const exists = await prisma.usuario.findUnique({ where: { email: data.email } });
        if (exists) throw new BadRequestException('Email já em uso.');
    }
    if (data.telefone && data.telefone !== current.telefone) {
        const exists = await prisma.usuario.findFirst({ where: { tenantId: current.tenantId, telefone: data.telefone, id: { not: id } } });
        if (exists) throw new BadRequestException('Telefone já em uso.');
    }
    if (data.nome && data.nome !== current.nome) {
        const exists = await prisma.usuario.findFirst({ where: { tenantId: current.tenantId, nome: { equals: data.nome, mode: 'insensitive' }, id: { not: id } } });
        if (exists) throw new BadRequestException(`Nome "${data.nome}" já existe.`);
    }

    return await prisma.usuario.update({
        where: { id },
        data: {
            nome: data.nome,
            email: data.email,
            telefone: data.telefone
        }
    });
  }
  // ------------------------------

  async remove(id: string) {
    await prisma.agendamento.deleteMany({ where: { profissionalId: id } });
    await prisma.bloqueio.deleteMany({ where: { profissionalId: id } });
    return await prisma.usuario.delete({ where: { id } });
  }
}