import { Module } from '@nestjs/common';
// ... outros imports ...
import { ClientsModule } from './modules/clients/clients.module'; // <--- TEM QUE TER ISSO

@Module({
  imports: [
    // ... outros módulos ...
    ClientsModule, // <--- TEM QUE ESTAR AQUI NA LISTA
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}