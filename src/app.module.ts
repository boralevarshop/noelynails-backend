import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module'; // <--- IMPORTANTE
import { TenantsModule } from './modules/tenants/tenants.module';
// ... outros imports se houver

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,    // <--- O módulo precisa estar aqui na lista
    TenantsModule,
    // ... outros módulos
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}