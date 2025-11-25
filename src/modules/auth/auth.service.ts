import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  
  async register(dados: any) {
    const { nomeSalao, nomeSeu, email, telefone, senha } = dados;

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) throw new BadRequestException('Este email já está cadastrado.');

    // --- GERAÇÃO AUTOMÁTICA DO SLUG ---
    let slug = this.gerarSlug(nomeSalao);
    
    // Verifica se já existe. Se existir, adiciona um código aleatório no final
    const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
    if (slugExiste) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`; // Ex: noely-nails-a1b2
    }
    // ----------------------------------

    // Trial de 7 dias
    const hoje = new Date();
    const dataFimTrial = new Date();
    dataFimTrial.setDate(hoje.getDate() + 7);

    const novoTenant = await prisma.tenant.create({
      data: {
        nome: nomeSalao,
        slug: slug,
        telefone: telefone,
        
        // Configuração do Trial
        plano: 'SUPREME', 
        statusAssinatura: 'TRIAL',
        trialFim: dataFimTrial,

        usuarios: {
          create: {
            nome: nomeSeu,
            email: email,
            senha: senha, // TODO: Hash no futuro
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
      tenantId: novoTenant.id,
      slug: novoTenant.slug
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

  // Função auxiliar para transformar "Salão da Jô" em "salao-da-jo"
  private gerarSlug(texto: string): string {
    return texto
      .toString()
      .toLowerCase()
      .normalize('NFD') // Separa acentos
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, '-') // Espaço vira traço
      .replace(/[^\w\-]+/g, '') // Remove caracteres especiais
      .replace(/\-\-+/g, '-') // Remove traços duplicados
      .replace(/^-+/, '') // Remove traço do começo
      .replace(/-+$/, ''); // Remove traço do fim
  }
}