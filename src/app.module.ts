import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module'; // Importante!
import { ServicesModule } from './modules/services/services.module';

@Module({
  imports: [
    // Carrega as variáveis de ambiente (.env)
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Carrega o módulo de autenticação que criamos
    AuthModule,
    
    ServicesModule, 
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}