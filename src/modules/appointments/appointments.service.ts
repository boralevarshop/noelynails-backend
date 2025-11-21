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

    // Criação no Banco
    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: cliente.id,
        profissionalId: professionalId, // Nome correto da coluna no banco
        servicoId: serviceId,           // Nome correto da coluna no banco
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

    // Dispara Webhook do n8n
    try {
        // URL do seu n8n (confira se está correta)
        const n8nUrl = 'https://n8n.devhenri.shop/webhook-test/novo-agendamento'; 
        
        await lastValueFrom(
            this.httpService.post(n8nUrl, agendamento)
        );
        console.log('Enviado para n8n com sucesso!');
    } catch (error) {
        console.error('Erro ao chamar n8n:', error);
    }

    return agendamento;
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.agendamento.findMany({
      where: { tenantId },
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { dataHora: 'desc' }
    });
  }
}