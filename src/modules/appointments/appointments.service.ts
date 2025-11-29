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
    this.logger.debug('Limpando agendamentos antigos...');
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

  async getAvailableSlots(tenantId: string, professionalId: string, date: string, serviceId: string) {
    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    const profissional = await prisma.usuario.findUnique({ where: { id: professionalId } });
    
    if (!servico || !profissional) throw new BadRequestException('Dados inválidos');

    const duracaoSlots = 30; 
    const duracaoServico = servico.duracaoMin;
    
    const diaAlvo = new Date(`${date}T12:00:00-03:00`);
    const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const diaSemana = diasMap[diaAlvo.getDay()];

    if (!profissional.horarios || !(profissional.horarios as any)[diaSemana]?.ativo) {
        return []; 
    }

    const jornada = (profissional.horarios as any)[diaSemana];
    const [iniH, iniM] = jornada.inicio.split(':').map(Number);
    const [fimH, fimM] = jornada.fim.split(':').map(Number);
    const inicioMinutos = iniH * 60 + iniM;
    const fimMinutos = fimH * 60 + fimM;

    const inicioDoDiaISO = new Date(`${date}T00:00:00-03:00`).toISOString();
    const fimDoDiaISO = new Date(`${date}T23:59:59-03:00`).toISOString();

    const agendamentos = await prisma.agendamento.findMany({
        where: {
            profissionalId: professionalId,
            status: { not: 'CANCELADO' },
            dataHora: { gte: inicioDoDiaISO, lte: fimDoDiaISO }
        }
    });

    const bloqueios = await prisma.bloqueio.findMany({
        where: {
            profissionalId: professionalId,
            inicio: { lt: fimDoDiaISO },
            fim: { gt: inicioDoDiaISO }
        }
    });

    const slotsDisponiveis: string[] = [];
    
    const agora = new Date();
    agora.setHours(agora.getHours() - 3); 
    const tempoLimite = new Date(agora.getTime() + 4 * 60 * 60 * 1000); 

    for (let time = inicioMinutos; time <= fimMinutos - duracaoServico; time += duracaoSlots) {
        const slotHora = Math.floor(time / 60);
        const slotMin = time % 60;
        const slotInicioStr = `${date}T${slotHora.toString().padStart(2,'0')}:${slotMin.toString().padStart(2,'0')}:00-03:00`;
        const slotInicio = new Date(slotInicioStr);
        const slotFim = new Date(slotInicio);
        slotFim.setMinutes(slotFim.getMinutes() + duracaoServico);

        if (slotInicio < tempoLimite) continue;

        const temConflitoAgenda = agendamentos.some(ag => {
            const agIni = new Date(ag.dataHora);
            const agFim = new Date(ag.dataFim);
            return (slotInicio < agFim && slotFim > agIni);
        });

        const temConflitoBloqueio = bloqueios.some(bl => {
            const blIni = new Date(bl.inicio);
            const blFim = new Date(bl.fim);
            return (slotInicio < blFim && slotFim > blIni);
        });

        if (!temConflitoAgenda && !temConflitoBloqueio) {
            slotsDisponiveis.push(`${slotHora.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`);
        }
    }
    return slotsDisponiveis;
  }

  async create(data: any) {
    const { tenantId, nomeCliente, telefoneCliente, serviceId, professionalId, dataHora, isInternal } = data;

    if (!serviceId || !professionalId || !dataHora) throw new BadRequestException('Dados incompletos.');

    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - 10);
    const dataAgendamento = new Date(dataHora);

    if (dataAgendamento < agora) throw new BadRequestException('Data no passado.');

    if (!isInternal) {
        const tempoLimite = new Date();
        tempoLimite.setHours(tempoLimite.getHours() + 4);
        if (dataAgendamento < tempoLimite) throw new BadRequestException('Agendamentos online exigem 4 horas de antecedência.');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Salão não encontrado.');

    if (tenant.plano === 'FREE') {
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const total = await prisma.agendamento.count({ where: { tenantId, createdAt: { gte: inicioMes } } });
        if (total >= 20) throw new BadRequestException('Limite do plano Free atingido.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    const profissional = await prisma.usuario.findUnique({ where: { id: professionalId } });
    if (!servico || !profissional) throw new BadRequestException('Inválido.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    if (profissional.horarios) {
        const dataBrasilia = new Date(dataInicio.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[dataBrasilia.getDay()]; 
        const configDia = (profissional.horarios as any)[diaSemana];

        if (!configDia || !configDia.ativo) throw new BadRequestException(`Profissional não atende neste dia.`);
        
        const minAg = dataBrasilia.getHours() * 60 + dataBrasilia.getMinutes();
        const [hIni, mIni] = configDia.inicio.split(':').map(Number);
        const [hFim, mFim] = configDia.fim.split(':').map(Number);
        if (minAg < (hIni*60+mIni) || minAg >= (hFim*60+mFim)) throw new BadRequestException(`Horário fora do expediente.`);
    }

    const bloqueio = await prisma.bloqueio.findFirst({
        where: {
            profissionalId: professionalId, 
            tenantId,
            AND: [{ inicio: { lt: dataFim } }, { fim: { gt: dataInicio } }]
        }
    });
    if (bloqueio) throw new BadRequestException('Horário bloqueado.');

    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: professionalId, 
        status: { not: StatusAgendamento.CANCELADO },
        AND: [{ dataHora: { lt: dataFim } }, { dataFim: { gt: dataInicio } }]
      }
    });
    if (conflito) throw new BadRequestException('Horário indisponível.');

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

  // --- CORREÇÃO AQUI: Aceita 4 argumentos agora ---
  async findAllByTenant(tenantId: string, date?: string, startDate?: string, endDate?: string) {
    const whereClause: any = { tenantId };

    if (date) {
      // Busca exata de um dia
      const inicioDia = new Date(`${date}T00:00:00.000-03:00`);
      const fimDia = new Date(`${date}T23:59:59.999-03:00`);
      whereClause.dataHora = { gte: inicioDia, lte: fimDia };
    } 
    else if (startDate && endDate) {
      // Busca por intervalo (Range) - Usado no Dashboard
      const inicio = new Date(`${startDate}T00:00:00.000-03:00`);
      const fim = new Date(`${endDate}T23:59:59.999-03:00`);
      whereClause.dataHora = { gte: inicio, lte: fim };
    }

    return await prisma.agendamento.findMany({
      where: whereClause,
      include: { cliente: true, servico: true, profissional: true, tenant: true },
      orderBy: { dataHora: 'asc' }
    });
  }
  // ------------------------------------------------

  async findRetentionCandidates(tenantId: string) {
    return []; 
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
        if (!tenant || !tenant.whatsappInstance || tenant.plano === 'FREE') return; 
        const payload = { ...dados, whatsappInstance: tenant.whatsappInstance };
        await lastValueFrom(this.httpService.post(`https://n8n.devhenri.shop/webhook/${tipo}`, payload));
    } catch (error) { console.error('Erro n8n:', error); }
  }
}