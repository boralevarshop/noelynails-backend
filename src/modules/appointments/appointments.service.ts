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

  async findRetentionCandidates(tenantId: string) {
    const candidatos: any[] = [];
    const servicos = await prisma.servico.findMany({ where: { tenantId, ativo: true } });

    for (const servico of servicos) {
      const diasParaVoltar = servico.diasRetorno || 30;
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() - diasParaVoltar);
      const inicioDia = new Date(dataAlvo.setHours(0, 0, 0, 0));
      const fimDia = new Date(dataAlvo.setHours(23, 59, 59, 999));

      const atendimentos = await prisma.agendamento.findMany({
        where: {
          tenantId,
          servicoId: servico.id,
          status: { in: [StatusAgendamento.CONCLUIDO, StatusAgendamento.CONFIRMADO] },
          dataHora: { gte: inicioDia, lte: fimDia },
          lembreteEnviado: false 
        },
        include: { cliente: true, servico: true, profissional: true }
      });

      for (const ag of atendimentos) {
        const temFuturo = await prisma.agendamento.findFirst({
          where: {
            tenantId,
            clienteId: ag.clienteId,
            dataHora: { gt: new Date() }, 
            status: { not: StatusAgendamento.CANCELADO }
          }
        });

        if (!temFuturo) {
          candidatos.push(ag);
          await prisma.agendamento.update({ where: { id: ag.id }, data: { lembreteEnviado: true } });
        }
      }
    }
    return candidatos;
  }

  async create(data: any) {
    const { tenantId, nomeCliente, telefoneCliente, serviceId, professionalId, dataHora } = data;

    if (!serviceId || !professionalId || !dataHora) throw new BadRequestException('Dados incompletos.');

    // 1. Validação do Plano
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Salão não encontrado.');

    if (tenant.plano === 'FREE') {
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        const totalMes = await prisma.agendamento.count({
            where: {
                tenantId,
                createdAt: { gte: inicioMes, lte: fimMes }
            }
        });
        if (totalMes >= 20) throw new BadRequestException('Limite de 20 agendamentos do plano Grátis atingido.');
    }

    // 2. Busca Serviço
    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    // 3. VALIDAÇÃO DE JORNADA DE TRABALHO
    const profissional = await prisma.usuario.findUnique({ where: { id: professionalId } });
    if (profissional && profissional.horarios) {
        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[dataInicio.getDay()]; 
        const configDia = (profissional.horarios as any)[diaSemana];

        if (!configDia || !configDia.ativo) {
            throw new BadRequestException(`O profissional ${profissional.nome} não atende neste dia da semana.`);
        }

        const minutosAgendamento = dataInicio.getHours() * 60 + dataInicio.getMinutes();
        const [hIni, mIni] = configDia.inicio.split(':').map(Number);
        const [hFim, mFim] = configDia.fim.split(':').map(Number);
        
        const inicioJornada = hIni * 60 + mIni;
        const fimJornada = hFim * 60 + mFim;

        if (minutosAgendamento < inicioJornada || minutosAgendamento >= fimJornada) {
             throw new BadRequestException(`Horário fora do expediente de ${profissional.nome} (${configDia.inicio} às ${configDia.fim}).`);
        }
    }

    // 4. VALIDAÇÃO DE BLOQUEIOS (CORRIGIDO AQUI)
    const bloqueio = await prisma.bloqueio.findFirst({
        where: {
            profissionalId: professionalId, // Mapeando a variável certa
            tenantId,
            AND: [
                { inicio: { lt: dataFim } },
                { fim: { gt: dataInicio } }
            ]
        }
    });

    if (bloqueio) {
        throw new BadRequestException(`Horário bloqueado para este profissional: ${bloqueio.motivo || 'Indisponível'}`);
    }

    // 5. VALIDAÇÃO DE CONFLITO (CORRIGIDO AQUI)
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: professionalId, // Mapeando a variável certa
        status: { not: StatusAgendamento.CANCELADO },
        AND: [ { dataHora: { lt: dataFim } }, { dataFim: { gt: dataInicio } } ]
      }
    });

    if (conflito) throw new BadRequestException('Este profissional já possui um cliente agendado neste horário!');

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
      include: { cliente: true, servico: true, profissional: true, tenant: true }
    });

    this.dispararWebhook(agendamento, 'novo-agendamento');

    return agendamento;
  }

  async findAllByTenant(tenantId: string, date?: string) {
    const whereClause: any = { tenantId };
    if (date) {
      const inicioDia = new Date(`${date}T00:00:00.000-03:00`);
      const fimDia = new Date(`${date}T23:59:59.999-03:00`);
      whereClause.dataHora = { gte: inicioDia, lte: fimDia };
    }
    return await prisma.agendamento.findMany({
      where: whereClause,
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { dataHora: 'asc' }
    });
  }

  async cancel(id: string, nomeCancelou: string) {
    return await prisma.agendamento.update({
      where: { id },
      data: { status: StatusAgendamento.CANCELADO, canceladoPor: nomeCancelou },
      include: { cliente: true, servico: true, profissional: true, tenant: true }
    });
  }

  private async dispararWebhook(dados: any, tipo: string) {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: dados.tenantId } });
        
        if (!tenant) return; 
        if (tenant.plano === 'FREE') return; 
        if (!tenant.whatsappInstance) return; 

        const payload = { ...dados, whatsappInstance: tenant.whatsappInstance };
        const n8nUrl = `https://n8n.devhenri.shop/webhook/${tipo}`; 
        await lastValueFrom(this.httpService.post(n8nUrl, payload));
    } catch (error) {
        console.error('Erro ao chamar n8n:', error);
    }
  }
}