import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module'; // Importante!

@Module({
  imports: [
    // Carrega as variáveis de ambiente (.env)
    ConfigModule.forRoot({ isGlobal: true }),
    
    // Carrega o módulo de autenticação que criamos
    AuthModule, 
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}