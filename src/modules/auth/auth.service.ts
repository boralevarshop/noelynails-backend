import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Instancia o Prisma manualmente para garantir conexão
const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  
  async register(dados: any) {
    const { nomeSalao, slug, nomeSeu, email, telefone, senha } = dados;

    // 1. Verifica se o Slug (link do salão) já existe
    const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
    if (slugExiste) {
      throw new BadRequestException('Este link de salão já está em uso.');
    }

    // 2. Verifica se o Email já existe
    const emailExiste = await prisma.usuario.findUnique({ where: { email } });
    if (emailExiste) {
      throw new BadRequestException('Este email já está cadastrado.');
    }

    // 3. Criação Atômica (Tudo ou nada): Cria Tenant e Usuário juntos
    // Em um sistema real, aqui criptografaríamos a senha com bcrypt.
    // Para este MVP inicial, vamos salvar simples para testar o fluxo, 
    // mas na próxima etapa adicionaremos a criptografia.
    
    const novoTenant = await prisma.tenant.create({
      data: {
        nome: nomeSalao,
        slug: slug, // ex: noelynails
        telefone: telefone,
        usuarios: {
          create: {
            nome: nomeSeu,
            email: email,
            senha: senha, // TODO: Adicionar Hash na Fase de Segurança
            role: 'DONO_SALAO',
            telefone: telefone
          }
        }
      },
      include: {
        usuarios: true
      }
    });

    return {
      sucesso: true,
      mensagem: 'Salão criado com sucesso!',
      tenantId: novoTenant.id,
      usuarioId: novoTenant.usuarios[0].id
    };
  }
}