import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { setupEventsDocumentation } from './domain/swagger/events-documentation';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const uploadsPath = join(process.cwd(), 'uploads');

  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
  app.useStaticAssets(uploadsPath, { prefix: '/api/uploads/' });

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
