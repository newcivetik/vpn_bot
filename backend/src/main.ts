import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const origins = [process.env.MINI_APP_URL, process.env.ADMIN_APP_URL].filter(
    Boolean,
  ) as string[];
  if (origins.length === 0 && process.env.NODE_ENV === 'production') {
    logger.warn(
      'No CORS origins configured! Set MINI_APP_URL and/or ADMIN_APP_URL',
    );
  }
  app.enableCors({
    origin:
      origins.length > 0
        ? origins
        : process.env.NODE_ENV === 'production'
          ? false
          : '*',
    methods: 'GET,POST,PATCH,DELETE',
  });

  app.enableShutdownHooks();

  const port = process.env.PORT || 3100;
  await app.listen(port);
  logger.log(`VPN Bot API запущен на порту ${port}`);
}
bootstrap();
