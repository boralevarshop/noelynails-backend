import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

const prisma = new PrismaClient();

@Injectable()
export class AppointmentsService {
  
  constructor(private readonly httpService: HttpService) {}

  async create(data: any) {
    const { 
      tenantId, nomeCliente, telefoneCliente, 
      serviceId, professionalId, dataHora 
    } = data;

    // 1. Validações Básicas
    if (!serviceId || !professionalId || !dataHora) {
      throw new BadRequestException('Serviço, Profissional e Data são obrigatórios.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    // 2. Calcula Início e Fim
    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    // --- TRAVA DE SEGURANÇA: VERIFICA CONFLITO DE HORÁRIO ---
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: professionalId, // Verifica só para este profissional
        status: { not: 'CANCELADO' },   // Ignora os cancelados (horário livre)
        AND: [
          { dataHora: { lt: dataFim } },   // O existente começa antes do novo terminar
          { dataFim: { gt: dataInicio } }  // O existente termina depois do novo começar
        ]
      }
    });

    if (conflito) {
      throw new BadRequestException('Este profissional já possui um agendamento neste horário!');
    }
    // ---------------------------------------------------------

    // 3. Busca ou Cria Cliente
    let cliente = await prisma.cliente.findFirst({ where: { tenantId, telefone: telefoneCliente } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { tenantId, nome: nomeCliente, telefone: telefoneCliente } });
    }

    // 4. Salva Agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: cliente.id,
        profissionalId: professionalId, // Mapeamento correto (PT-BR)
        servicoId: serviceId,           // Mapeamento correto (PT-BR)
        dataHora: dataInicio,
        dataFim: dataFim,
        status: 'CONFIRMADO',           // Já nasce confirmado
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        tenant: true
      }
    });

    // 5. Dispara n8n
    this.dispararWebhook(agendamento, 'novo-agendamento');

    return agendamento;
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.agendamento.findMany({
      where: { tenantId },
      include: { cliente: true, servico: true, profissional: true },
      // Ordena do mais próximo para o mais distante
      orderBy: { dataHora: 'asc' }
    });
  }

  async cancel(id: string) {
    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: { status: 'CANCELADO' },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        tenant: true
      }
    });

    // Opcional: Avisar n8n sobre cancelamento
    // this.dispararWebhook(agendamento, 'cancelamento');

    return agendamento;
  }

  private async dispararWebhook(dados: any, tipo: string) {
    try {
        // URL do seu n8n
        const n8nUrl = `https://n8n.devhenri.shop/webhook-test/${tipo}`; 
        await lastValueFrom(this.httpService.post(n8nUrl, dados));
    } catch (error) {
        console.error('Erro ao chamar n8n:', error);
    }
  }
}