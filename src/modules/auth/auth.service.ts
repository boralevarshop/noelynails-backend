import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  
  async register(dados: any) {
    const { nomeSalao, slug, nomeSeu, email, telefone, senha } = dados;

    const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
    if (slugExiste) throw new BadRequestException('Este link de salão já está em uso.');

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) throw new BadRequestException('Este email já está cadastrado.');

    // Trial de 7 dias
    const hoje = new Date();
    const dataFimTrial = new Date();
    dataFimTrial.setDate(hoje.getDate() + 7);

    const novoTenant = await prisma.tenant.create({
      data: {
        nome: nomeSalao,
        slug: slug,
        telefone: telefone,
        
        plano: 'SUPREME', 
        statusAssinatura: 'TRIAL',
        trialFim: dataFimTrial,

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
      mensagem: 'Salão criado com 7 dias de Plano Supreme Grátis!',
      tenantId: novoTenant.id 
    };
  }

  async login(dados: any) {
    const { email, senha } = dados;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!usuario || usuario.senha !== senha) {
      throw new UnauthorizedException('Email ou senha incorretos.');
    }

    return {
      sucesso: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        tenant: {
          id: usuario.tenant.id,
          nome: usuario.tenant.nome,
          slug: usuario.tenant.slug
        }
      }
    };
  }
}