import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const origins = [process.env.MINI_APP_URL, process.env.ADMIN_APP_URL].filter(Boolean) as string[];
  app.enableCors({
    origin: origins.length > 0 ? origins : '*',
    methods: 'GET,POST,PATCH,DELETE',
  });

  const port = process.env.PORT || 3100;
  await app.listen(port);
  console.log(`🚀 VPN Bot API запущен на порту ${port}`);
}
bootstrap();
