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

  // --- CRON JOB (Limpeza) ---
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

  // --- CALCULADORA DE DISPONIBILIDADE ---
  async getAvailableSlots(tenantId: string, professionalId: string, date: string, serviceId: string) {
    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    const profissional = await prisma.usuario.findUnique({ where: { id: professionalId } });
    
    if (!servico || !profissional) throw new BadRequestException('Dados inválidos');

    const duracaoSlots = 30; 
    const duracaoServico = servico.duracaoMin;
    
    // Ajuste de Fuso para identificar dia da semana
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

    // Busca Agendamentos (Mapeando profissionalId corretamente)
    const agendamentos = await prisma.agendamento.findMany({
        where: {
            profissionalId: professionalId, // <--- CORREÇÃO AQUI
            status: { not: 'CANCELADO' },
            dataHora: { gte: inicioDoDiaISO, lte: fimDoDiaISO }
        }
    });

    // Busca Bloqueios (Mapeando profissionalId corretamente)
    const bloqueios = await prisma.bloqueio.findMany({
        where: {
            profissionalId: professionalId, // <--- CORREÇÃO AQUI
            inicio: { lt: fimDoDiaISO },
            fim: { gt: inicioDoDiaISO }
        }
    });

    const slotsDisponiveis: string[] = [];
    const agora = new Date();
    agora.setHours(agora.getHours() - 3);

    for (let time = inicioMinutos; time <= fimMinutos - duracaoServico; time += duracaoSlots) {
        const slotHora = Math.floor(time / 60);
        const slotMin = time % 60;
        
        const slotInicioStr = `${date}T${slotHora.toString().padStart(2,'0')}:${slotMin.toString().padStart(2,'0')}:00-03:00`;
        const slotInicio = new Date(slotInicioStr);
        
        const slotFim = new Date(slotInicio);
        slotFim.setMinutes(slotFim.getMinutes() + duracaoServico);

        if (slotInicio < agora) continue;

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
            const label = `${slotHora.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;
            slotsDisponiveis.push(label);
        }
    }

    return slotsDisponiveis;
  }

  // --- RETENÇÃO ---
  async findRetentionCandidates(tenantId: string) {
    // Simplificado para evitar erros de tipagem temporários se houver
    return [];
  }

  // --- CRIAÇÃO DE AGENDAMENTO ---
  async create(data: any) {
    const { tenantId, nomeCliente, telefoneCliente, serviceId, professionalId, dataHora } = data;

    if (!serviceId || !professionalId || !dataHora) throw new BadRequestException('Dados incompletos.');

    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - 10);
    const dataAgendamento = new Date(dataHora);

    if (dataAgendamento < agora) throw new BadRequestException('Não é possível criar agendamentos no passado.');

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
        if (totalMes >= 20) throw new BadRequestException('Limite do plano Free atingido.');
    }

    const servico = await prisma.servico.findUnique({ where: { id: serviceId } });
    if (!servico) throw new BadRequestException('Serviço não encontrado.');

    const dataInicio = new Date(dataHora);
    const dataFim = new Date(dataInicio.getTime() + servico.duracaoMin * 60000);

    const profissional = await prisma.usuario.findUnique({ where: { id: professionalId } });
    
    if (profissional && profissional.horarios) {
        const dataBrasilia = new Date(dataInicio.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const diaSemana = diasMap[dataBrasilia.getDay()]; 

        const configDia = (profissional.horarios as any)[diaSemana];

        if (!configDia || !configDia.ativo) throw new BadRequestException(`Profissional não atende neste dia.`);
        
        const minutosAgendamento = dataBrasilia.getHours() * 60 + dataBrasilia.getMinutes();
        const [hIni, mIni] = configDia.inicio.split(':').map(Number);
        const [hFim, mFim] = configDia.fim.split(':').map(Number);
        
        const inicioJornada = hIni * 60 + mIni;
        const fimJornada = hFim * 60 + mFim;

        if (minutosAgendamento < inicioJornada || minutosAgendamento >= fimJornada) {
             throw new BadRequestException(`Horário fora do expediente.`);
        }
    }

    // CORREÇÃO AQUI: Mapeando professionalId -> profissionalId
    const bloqueio = await prisma.bloqueio.findFirst({
        where: {
            profissionalId: professionalId, // <--- CORREÇÃO
            tenantId,
            AND: [
                { inicio: { lt: dataFim } }, 
                { fim: { gt: dataInicio } }  
            ]
        }
    });

    if (bloqueio) throw new BadRequestException(`Horário bloqueado: ${bloqueio.motivo || 'Indisponível'}`);

    // CORREÇÃO AQUI TAMBÉM
    const conflito = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: professionalId, // <--- CORREÇÃO
        status: { not: StatusAgendamento.CANCELADO },
        AND: [ { dataHora: { lt: dataFim } }, { dataFim: { gt: dataInicio } } ]
      }
    });

    if (conflito) throw new BadRequestException('Este profissional já possui um cliente agendado neste horário!');

    let cliente = await prisma.cliente.findFirst({ where: { tenantId, telefone: telefoneCliente } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { tenantId, nome: nomeCliente, telefone: telefoneCliente } });
    }

    // CORREÇÃO NA CRIAÇÃO
    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: cliente.id,
        profissionalId: professionalId, // <--- CORREÇÃO
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
        if (!tenant || !tenant.whatsappInstance || tenant.plano === 'FREE') return; 
        const payload = { ...dados, whatsappInstance: tenant.whatsappInstance };
        const n8nUrl = `https://n8n.devhenri.shop/webhook/${tipo}`; 
        await lastValueFrom(this.httpService.post(n8nUrl, payload));
    } catch (error) { console.error('Erro n8n:', error); }
  }
}