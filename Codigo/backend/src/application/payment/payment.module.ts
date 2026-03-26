import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpModule } from '@nestjs/axios';
import {
  PaymentController,
  PaymentHealthController,
  PaymentWebhookController,
} from './controllers';
import {
  CreatePaymentService,
  GetPaymentService,
  PaymentFacadeService,
  PaymentHealthService,
  PaymentWebhookService,
  SearchPaymentService,
  UpdatePaymentService,
} from './services';
import { PaymentDomainListeners, PaymentEventListeners } from './events';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  mercadoPagoConfig,
  MercadoPagoConfig,
  MercadoPagoHttpService,
  MercadoPagoTokenService,
} from './providers/mercadopago';

@Module({
  controllers: [PaymentController, PaymentWebhookController, PaymentHealthController],
  imports: [
    ConfigModule.forFeature(mercadoPagoConfig),
    ConfigModule,
    EventEmitterModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    MailModule,
    NotificationsModule,
  ],
  providers: [
    MercadoPagoConfig,
    MercadoPagoTokenService,
    MercadoPagoHttpService,
    CreatePaymentService,
    GetPaymentService,
    SearchPaymentService,
    UpdatePaymentService,
    PaymentWebhookService,
    PaymentHealthService,
    PaymentFacadeService,
    PaymentEventListeners,
    PaymentDomainListeners,
    {
      provide: Logger,
      useFactory: () => new Logger('PaymentModule'),
    },
  ],
  exports: [PaymentFacadeService, GetPaymentService],
})
export class PaymentModule {}
