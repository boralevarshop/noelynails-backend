import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  
  // Função de Cadastro (Já estava aqui)
  async register(dados: any) {
    const { nomeSalao, slug, nomeSeu, email, telefone, senha } = dados;

    const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
    if (slugExiste) throw new BadRequestException('Este link de salão já está em uso.');

    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) throw new BadRequestException('Este email já está cadastrado.');

    const novoTenant = await prisma.tenant.create({
      data: {
        nome: nomeSalao,
        slug: slug,
        telefone: telefone,
        usuarios: {
          create: {
            nome: nomeSeu,
            email: email,
            senha: senha, // TODO: Criptografar futuramente
            role: 'DONO_SALAO',
            telefone: telefone
          }
        }
      },
      include: { usuarios: true }
    });

    return { sucesso: true, mensagem: 'Salão criado com sucesso!' };
  }

  // --- NOVO: Função de Login ---
  async login(dados: any) {
    const { email, senha } = dados;

    // 1. Busca o usuário pelo email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { tenant: true } // Trazemos os dados do salão junto
    });

    if (!usuario) {
      throw new UnauthorizedException('Email ou senha incorretos.');
    }

    // 2. Verifica a senha (comparação simples por enquanto)
    if (usuario.senha !== senha) {
      throw new UnauthorizedException('Email ou senha incorretos.');
    }

    // 3. Retorna os dados do usuário para o painel salvar
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