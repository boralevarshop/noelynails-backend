import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient, StatusAgendamento } from '@prisma/client';
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

    if (!serviceId || !professionalId || !dataHora) {
      throw new BadRequestException('Dados incompletos.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    // Trava de conflito
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: professionalId,
        status: { not: StatusAgendamento.CANCELADO },
        AND: [
          { dataHora: { lt: dataFim } },
          { dataFim: { gt: dataInicio } }
        ]
      }
    });

    if (conflito) {
      throw new BadRequestException('Este profissional já possui um agendamento neste horário!');
    }

    let cliente = await prisma.cliente.findFirst({ where: { tenantId, telefone: telefoneCliente } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { tenantId, nome: nomeCliente, telefone: telefoneCliente } });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: cliente.id,
        profissionalId: professionalId,
        servicoId: serviceId,
        dataHora: dataInicio,
        dataFim: dataFim,
        status: StatusAgendamento.CONFIRMADO,
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        tenant: true
      }
    });

    this.dispararWebhook(agendamento, 'novo-agendamento');

    return agendamento;
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.agendamento.findMany({
      where: { tenantId },
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { dataHora: 'asc' }
    });
  }

  async cancel(id: string, nomeCancelou: string) {
    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: { 
        status: StatusAgendamento.CANCELADO,
        canceladoPor: nomeCancelou 
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        tenant: true
      }
    });

    // this.dispararWebhook(agendamento, 'cancelamento');

    return agendamento;
  }

  private async dispararWebhook(dados: any, tipo: string) {
    try {
        // --- CORREÇÃO: URL DE PRODUÇÃO (SEM -test) ---
        const n8nUrl = `https://n8n.devhenri.shop/webhook/${tipo}`; 
        // ---------------------------------------------
        
        await lastValueFrom(this.httpService.post(n8nUrl, dados));
        console.log(`Webhook ${tipo} disparado para ${n8nUrl}`);
    } catch (error) {
        console.error('Erro ao chamar n8n:', error);
    }
  }
}