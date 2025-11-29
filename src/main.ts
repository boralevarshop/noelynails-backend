import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express'; // <--- IMPORTANTE

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // --- AUMENTANDO O LIMITE DE UPLOAD ---
  // Isso permite enviar fotos convertidas em texto (Base64)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  // -------------------------------------

  app.enableCors();
  
  await app.listen(3000);
}
bootstrap();