import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  async register(dados: any) {
    const { nomeSalao, slug, nomeSeu, email, telefone, senha } = dados;

    const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
    if (slugExiste) {
      throw new BadRequestException('Este link de salão já está em uso.');
    }

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      throw new BadRequestException('Este email já está cadastrado.');
    }

    const novoTenant = await prisma.tenant.create({
      data: {
        nome: nomeSalao,
        slug: slug,
        telefone: telefone,
        usuarios: {
          create: {
            nome: nomeSeu,
            email: email,
            senha: senha,
            role: 'DONO_SALAO',
            telefone: telefone
          }
        }
      },
      include: { usuarios: true }
    });

    return {
      sucesso: true,
      mensagem: 'Salão criado com sucesso!',
      tenantId: novoTenant.id
    };
  }
}