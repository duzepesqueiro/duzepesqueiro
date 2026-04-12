import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../../application/auth/auth.module';
import { ExceptionModule } from '../../application/exception/exception.module';
import { LogsModule } from '../../application/logs/logs.module';
import { MailModule } from '../../application/mail/mail.module';
import { NotificationsModule } from '../../application/notifications/notifications.module';
import { PaymentModule } from '../../application/payment/payment.module';
import { SecurityModule } from '../../application/security/security.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { EventsModule } from '../events';
import { InventoryModule } from '../inventory';
import {
  RentalAdminController,
  RentalAdminFacadeController,
  RentalBookingController,
  RentalKpiController,
  RentalUserController,
} from './controllers';
import {
  AluguelEmailListener,
  AluguelNotificationListener,
  RentalMetricsListener,
  RentalPaymentListener,
} from './events';
import { RentalBookingRepository, RentalRepository } from './repositories';
import {
  RentalAdminService,
  RentalAdminFacadeService,
  RentalBookingService,
  RentalKpiService,
  RentalUserService,
} from './services';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ExceptionModule,
    SecurityModule,
    LogsModule,
    MailModule,
    PaymentModule,
    NotificationsModule,
    InventoryModule,
    EventsModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    RentalAdminController,
    RentalAdminFacadeController,
    RentalKpiController,
    RentalUserController,
    RentalBookingController,
  ],
  providers: [
    RentalRepository,
    RentalBookingRepository,
    RentalAdminService,
    RentalAdminFacadeService,
    RentalKpiService,
    RentalUserService,
    RentalBookingService,
    AluguelEmailListener,
    AluguelNotificationListener,
    RentalMetricsListener,
    RentalPaymentListener,
  ],
  exports: [
    RentalRepository,
    RentalBookingRepository,
    RentalAdminService,
    RentalKpiService,
    RentalUserService,
    RentalBookingService,
  ],
})
export class AluguelModule {}
