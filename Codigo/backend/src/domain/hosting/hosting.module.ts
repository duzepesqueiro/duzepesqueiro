import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LogsModule } from '../../application/logs/logs.module';
import { MailModule } from '../../application/mail/mail.module';
import { NotificationsModule } from '../../application/notifications/notifications.module';
import { PaymentModule } from '../../application/payment/payment.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import {
  AvaliacaoController,
  BloqueioController,
  ChaleController,
  DashboardController,
  PrecoRegraController,
  ReservaController,
} from './controllers';
import { HostingNotificationListener } from './events';
import {
  AbandonedReservationCleanupJob,
  HospedagemKPICalculationJob,
  HospedagemMetricsJobs,
  ReservationNotificationJob,
} from './jobs';
import {
  CapacityValidationMiddleware,
  HospedagemAuthorizationMiddleware,
  ReservationDateValidationMiddleware,
} from './middlewares';
import {
  AvaliacaoReservaRepository,
  BloqueioChaleRepository,
  ChaleRepository,
  HospedeReservaRepository,
  PrecoRegraRepository,
  ReservaRepository,
} from './repositories';
import {
  AvaliacaoService,
  BloqueioService,
  ChaleService,
  HospedagemMetricsService,
  HospedagemNotificationService,
  HostingImageStorageService,
  HostingTermsStorageService,
  PoliticaCancelamentoService,
  PrecoService,
  ReservaService,
} from './services';

@Module({
  controllers: [
    ChaleController,
    ReservaController,
    BloqueioController,
    PrecoRegraController,
    AvaliacaoController,
    DashboardController,
  ],
  imports: [PrismaModule, PaymentModule, LogsModule, MailModule, NotificationsModule],
  providers: [
    AvaliacaoReservaRepository,
    BloqueioChaleRepository,
    ChaleRepository,
    ChaleService,
    BloqueioService,
    PrecoService,
    AvaliacaoService,
    PoliticaCancelamentoService,
    HospedagemMetricsService,
    HospedagemMetricsJobs,
    HospedagemKPICalculationJob,
    ReservationNotificationJob,
    AbandonedReservationCleanupJob,
    HospedagemNotificationService,
    HostingNotificationListener,
    HospedeReservaRepository,
    PrecoRegraRepository,
    ReservaRepository,
    ReservaService,
    HostingImageStorageService,
    HostingTermsStorageService,
  ],
  exports: [
    AvaliacaoReservaRepository,
    BloqueioChaleRepository,
    ChaleRepository,
    ChaleService,
    BloqueioService,
    PrecoService,
    AvaliacaoService,
    PoliticaCancelamentoService,
    HospedagemMetricsService,
    HospedagemNotificationService,
    HospedeReservaRepository,
    PrecoRegraRepository,
    ReservaRepository,
    ReservaService,
    HostingImageStorageService,
    HostingTermsStorageService,
  ],
})
export class HostingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HospedagemAuthorizationMiddleware).forRoutes('*');
    consumer
      .apply(ReservationDateValidationMiddleware)
      .forRoutes(
        { path: 'reservas', method: RequestMethod.POST },
        { path: 'api/reservas', method: RequestMethod.POST },
        { path: 'reservas/manual', method: RequestMethod.POST },
        { path: 'api/reservas/manual', method: RequestMethod.POST },
        { path: 'reservas/:id', method: RequestMethod.PUT },
        { path: 'api/reservas/:id', method: RequestMethod.PUT },
      );
    consumer
      .apply(CapacityValidationMiddleware)
      .forRoutes(
        { path: 'reservas', method: RequestMethod.POST },
        { path: 'api/reservas', method: RequestMethod.POST },
        { path: 'reservas/manual', method: RequestMethod.POST },
        { path: 'api/reservas/manual', method: RequestMethod.POST },
        { path: 'reservas/:id', method: RequestMethod.PUT },
        { path: 'api/reservas/:id', method: RequestMethod.PUT },
      );
  }
}
