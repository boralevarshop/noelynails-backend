import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient, StatusAgendamento } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';

const prisma = new PrismaClient();

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  
  constructor(private readonly httpService: HttpService) {}

  // Rotina automática para concluir agendamentos antigos
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.debug('Verificando agendamentos concluídos...');
    const limiteTempo = new Date();
    limiteTempo.setHours(limiteTempo.getHours() - 1);

    await prisma.agendamento.updateMany({
      where: {
        status: StatusAgendamento.CONFIRMADO,
        dataFim: { lt: limiteTempo }
      },
      data: { status: StatusAgendamento.CONCLUIDO }
    });
  }

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

  // --- ATUALIZADO: Suporte a filtro de data ---
  async findAllByTenant(tenantId: string, date?: string) {
    const whereClause: any = { tenantId };

    // Se enviou data (YYYY-MM-DD), filtra o dia inteiro
    if (date) {
      const inicioDia = new Date(`${date}T00:00:00.000Z`);
      const fimDia = new Date(`${date}T23:59:59.999Z`);
      
      whereClause.dataHora = {
        gte: inicioDia,
        lte: fimDia
      };
    }

    return await prisma.agendamento.findMany({
      where: whereClause,
      include: {
        cliente: true,
        servico: true,
        profissional: true 
      },
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
      include: { cliente: true, servico: true, profissional: true, tenant: true }
    });
    return agendamento;
  }

  private async dispararWebhook(dados: any, tipo: string) {
    try {
        const n8nUrl = `https://n8n.devhenri.shop/webhook/${tipo}`; 
        await lastValueFrom(this.httpService.post(n8nUrl, dados));
    } catch (error) {
        console.error('Erro ao chamar n8n:', error);
    }
  }
}