import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './config';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { SecurityModule } from './application/security/security.module';
import { ExceptionModule } from './application/exception/exception.module';
import { AuthModule } from './application/auth/auth.module';
import { NotificationsModule } from './application/notifications/notifications.module';
import { MailModule } from './application/mail/mail.module';
import { PaymentModule } from './application/payment/payment.module';
import { LogsModule } from './application/logs/logs.module';
import { ReviewsModule } from './application/reviews/reviews.module';
import { ExportModule } from './application/export/export.module';
import { AluguelModule } from './domain/rentals';
import { EventsModule } from './domain/events';
import { InventoryModule } from './domain/inventory';
import { SalesModule } from './domain/sales';
import { UsersModule } from './domain/users';
import { HostingModule } from './domain/hosting';
import { WebsocketModule } from './infrastructure/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env.qa',
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    PrismaModule,
    SecurityModule,
    ExceptionModule,
    AuthModule,
    LogsModule,
    NotificationsModule,
    MailModule,
    PaymentModule,
    ReviewsModule,
    ExportModule,
    AluguelModule,
    EventsModule,
    InventoryModule,
    SalesModule,
    UsersModule,
    HostingModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
