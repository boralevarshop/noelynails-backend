import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

const prisma = new PrismaClient();

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly asaasUrl = process.env.ASAAS_URL;
  private readonly asaasKey = process.env.ASAAS_API_KEY;

  constructor(private readonly httpService: HttpService) {}

  private async callAsaas(method: 'get' | 'post', endpoint: string, data?: any) {
    try {
      const response = await lastValueFrom(
        this.httpService.request({
          method,
          url: `${this.asaasUrl}${endpoint}`,
          data,
          headers: { access_token: this.asaasKey }
        })
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro Asaas: ${JSON.stringify(error.response?.data || error.message)}`);
      throw new BadRequestException('Erro na comunicação com o gateway de pagamento.');
    }
  }

  async createSubscription(tenantId: string, planoId: string) {
    let valor = 0;
    if (planoId === 'INDIVIDUAL') valor = 24.90;
    if (planoId === 'PRIME') valor = 49.90;
    if (planoId === 'SUPREME') valor = 89.90;
    
    if (valor === 0) throw new BadRequestException('Plano inválido ou gratuito.');

    const tenant = await prisma.tenant.findUnique({ 
        where: { id: tenantId },
        include: { usuarios: { where: { role: 'DONO_SALAO' } } }
    });

    if (!tenant) throw new BadRequestException('Salão não encontrado.');
    const dono = tenant.usuarios[0];

    let customerId = tenant.asaasCustomerId;

    if (!customerId) {
        try {
            const customer = await this.callAsaas('post', '/customers', {
                name: tenant.nome,
                email: dono.email,
                cpfCnpj: '00000000000', 
                mobilePhone: tenant.telefone || dono.telefone
            });
            customerId = customer.id;

            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { asaasCustomerId: customerId }
            });
        } catch (e) {
            throw new BadRequestException('Erro ao criar cliente no Asaas.');
        }
    }

    const cobranca = await this.callAsaas('post', '/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: valor,
        dueDate: new Date().toISOString().split('T')[0], 
        description: `Assinatura Plano ${planoId} - ${tenant.nome}`,
        postalService: false
    });

    return {
        sucesso: true,
        pagamentoId: cobranca.id,
        pixUrl: cobranca.invoiceUrl,
        plano: planoId
    };
  }
}