import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilita o CORS para que o Frontend (em outro domínio) consiga acessar
  app.enableCors({
    origin: true, // Em produção, trocaremos isso pelo domínio exato
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Pega a porta do ambiente ou usa 3000
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();