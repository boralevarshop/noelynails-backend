import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // <--- Importe
import { AuthModule } from './modules/auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ServicesModule } from './modules/services/services.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ClientsModule } from './modules/clients/clients.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // <--- Ativa o Cron
    HttpModule, 
    AuthModule,
    AppointmentsModule,
    ServicesModule,
    ProfessionalsModule,
    ClientsModule,
    UsersModule,
    TenantsModule,
    BlocksModule,
    BillingModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}