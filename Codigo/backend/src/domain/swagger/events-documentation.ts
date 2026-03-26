import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupEventsDocumentation(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('DuZePesqueiro API')
    .setDescription('API do sistema DuZePesqueiro - Módulo de Eventos')
    .setVersion('1.0')
    .addTag('Events - User', 'Endpoints públicos e de usuário para eventos')
    .addTag('Events - Registrations', 'Gerenciamento de inscrições em eventos')
    .addTag('Events - Admin', 'CRUD administrativo de eventos')
    .addTag('Events - KPIs', 'Indicadores de performance')
    .addTag('Events - Charts', 'Dados para gráficos')
    .addTag('Events - Payments', 'Pagamento online de eventos')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
