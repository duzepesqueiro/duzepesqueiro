import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../../application/auth/auth.module';
import { MailModule } from '../../application/mail/mail.module';
import { PaymentModule } from '../../application/payment/payment.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import {
  EventAdminController,
  EventChartController,
  EventKpiController,
} from './controllers/admin';
import {
  EventPaymentController,
  EventRegistrationController,
  EventUserController,
} from './controllers/user';
import { EventsGateway } from './gateways';
import {
  EventEmailListener,
  EventMetricsListener,
  EventNotificationListener,
} from './listeners';
import {
  EventKpiRepository,
  EventRegistrationRepository,
  EventRepository,
} from './repositories';
import {
  EventAdminService,
  EventChartService,
  EventKpiService,
  FileUploadService,
} from './services/admin';
import {
  EventPaymentService,
  EventRegistrationService,
  EventUserService,
} from './services/user';

const imageFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = /\/(jpg|jpeg|png|webp|gif)$/i.test(file.mimetype);
  callback(allowed ? null : new Error('Tipo de arquivo inválido'), allowed);
};

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MailModule,
    PaymentModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  ],
  controllers: [
    EventRegistrationController,
    EventPaymentController,
    EventUserController,
    EventKpiController,
    EventChartController,
    EventAdminController,
  ],
  providers: [
    EventRepository,
    EventRegistrationRepository,
    EventKpiRepository,
    FileUploadService,
    EventUserService,
    EventRegistrationService,
    EventPaymentService,
    EventAdminService,
    EventKpiService,
    EventChartService,
    EventEmailListener,
    EventNotificationListener,
    EventMetricsListener,
    EventsGateway,
  ],
  exports: [
    EventUserService,
    EventRegistrationService,
    EventAdminService,
    EventsGateway,
  ],
})
export class EventsModule {}
