import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { setupEventsDocumentation } from './domain/swagger/events-documentation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupEventsDocumentation(app);

  const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

  await app.listen(port, '0.0.0.0');
  logger.log(`API running at http://0.0.0.0:${port}`);
}

bootstrap();

