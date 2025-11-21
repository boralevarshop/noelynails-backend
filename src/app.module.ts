import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module'; // Importante!
import { ServicesModule } from './modules/services/services.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';

@Module({
  imports: [
    // Carrega as variáveis de ambiente (.env)
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Carrega o módulo de autenticação que criamos
    AuthModule,
    
    ServicesModule,
    
    ProfessionalsModule, 
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}