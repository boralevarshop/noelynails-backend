import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AppointmentsService {
  
  async create(data: any) {
    const { 
      tenantId, 
      nomeCliente, 
      telefoneCliente, 
      serviceId, 
      professionalId, 
      dataHora 
    } = data;

    if (!serviceId || !professionalId || !dataHora) {
      throw new BadRequestException('Serviço, Profissional e Data são obrigatórios.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    let cliente = await prisma.cliente.findFirst({
      where: { tenantId, telefone: telefoneCliente }
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          tenantId,
          nome: nomeCliente,
          telefone: telefoneCliente
        }
      });
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: cliente.id,
        
        // CORREÇÃO 1: Mapeando para 'profissionalId' (Português)
        profissionalId: professionalId,
        
        // CORREÇÃO 2: Mapeando para 'servicoId' (Português)
        servicoId: serviceId,
        
        dataHora: dataInicio,
        dataFim: dataFim,
        status: 'PENDENTE',
      },
      include: {
        cliente: true,
        servico: true,
        profissional: true
      }
    });

    return agendamento;
  }

  async findAllByTenant(tenantId: string) {
    return await prisma.agendamento.findMany({
      where: { tenantId },
      include: {
        cliente: true,
        servico: true,
        profissional: true // CORREÇÃO: A relação também chama 'profissional' no schema
      },
      orderBy: { dataHora: 'desc' }
    });
  }
}