import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { HttpModule } from '@nestjs/axios'; // <--- Importante

@Module({
  imports: [HttpModule], // <--- Adicionamos aqui para liberar o uso
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}