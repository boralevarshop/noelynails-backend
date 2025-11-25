import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProfessionalsService {
  
  async create(data: any) {
    const { nome, email, telefone, tenantId } = data;

    // 1. Busca o plano do salão
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!tenant) throw new BadRequestException('Salão não encontrado.');

    // 2. Conta quantos funcionários (role PROFISSIONAL) já existem
    const totalProfissionais = await prisma.usuario.count({
        where: { 
            tenantId, 
            role: 'PROFISSIONAL' 
        }
    });

    // 3. REGRAS DE LIMITES POR PLANO
    let limiteExtras = 0; // Padrão (Free/Individual = Só o dono)
    
    if (tenant.plano === 'FREE') limiteExtras = 0;       // Só o dono
    if (tenant.plano === 'INDIVIDUAL') limiteExtras = 0; // Só o dono
    if (tenant.plano === 'PRIME') limiteExtras = 3;      // Dono + 3 = 4
    if (tenant.plano === 'SUPREME') limiteExtras = 999;  // Ilimitado

    // 4. Trava
    if (totalProfissionais >= limiteExtras) {
        throw new BadRequestException(`O plano ${tenant.plano} não permite adicionar mais membros à equipe. Faça um Upgrade!`);
    }

    // 5. Verifica se email já existe
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      throw new BadRequestException('Este email já está cadastrado no sistema.');
    }

    // 6. Cria o usuário
    return await prisma.usuario.create({
      data: {
        nome,
        email,
        telefone,
        senha: '123', 
        role: 'PROFISSIONAL',
        tenantId,
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.usuario.findMany({
      where: {
        tenantId: tenantId,
        role: { in: [Role.PROFISSIONAL, Role.DONO_SALAO] } 
      },
      orderBy: { nome: 'asc' } 
    });
  }

  async remove(id: string) {
    // Limpa agendamentos e bloqueios antes de apagar o profissional
    await prisma.agendamento.deleteMany({ where: { profissionalId: id } });
    await prisma.bloqueio.deleteMany({ where: { profissionalId: id } });
    
    return await prisma.usuario.delete({
      where: { id },
    });
  }
}