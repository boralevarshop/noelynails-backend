import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProfessionalsService {
  
  // Criar um novo profissional (Cria um Usuário com role PROFISSIONAL)
  async create(data: any) {
    const { nome, email, telefone, tenantId } = data;

    // Verifica se email já existe
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      throw new BadRequestException('Este email já está cadastrado no sistema.');
    }

    return await prisma.usuario.create({
      data: {
        nome,
        email,
        telefone,
        senha: '123', // Senha padrão inicial (futuramente eles podem mudar)
        role: 'PROFISSIONAL',
        tenantId,
      },
    });
  }

  // Listar apenas os profissionais DESTE salão
  async findAllByTenant(tenantId: string) {
    return await prisma.usuario.findMany({
      where: {
        tenantId: tenantId,
        role: 'PROFISSIONAL',
      },
    });
  }

  // Deletar profissional
  async remove(id: string) {
    return await prisma.usuario.delete({
      where: { id },
    });
  }
}