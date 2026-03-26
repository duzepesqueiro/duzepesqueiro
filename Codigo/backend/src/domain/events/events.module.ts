import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
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
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'events'),
        filename: (_req, file, callback) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${suffix}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  ],
  controllers: [
    EventUserController,
    EventRegistrationController,
    EventPaymentController,
    EventAdminController,
    EventKpiController,
    EventChartController,
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
