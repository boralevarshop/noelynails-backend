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

    if (!serviceId || !professionalId || !dataHora) {
      throw new BadRequestException('Dados incompletos.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

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
        status: 'CONFIRMADO',
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true,
        tenant: true
      }
    });

    // Dispara n8n (Criação)
    this.dispararWebhook(agendamento, 'novo-agendamento');

    return agendamento;
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.agendamento.findMany({
      where: { tenantId },
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { dataHora: 'desc' }
    });
  }

  // --- NOVO: Função de Cancelar ---
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

    // Dispara n8n (Cancelamento) - Futuramente podemos avisar o cliente que foi cancelado
    // this.dispararWebhook(agendamento, 'cancelamento');

    return agendamento;
  }

  // Função auxiliar para chamar o n8n
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