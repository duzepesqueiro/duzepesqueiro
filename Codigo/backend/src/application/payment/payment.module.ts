import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PaymentController } from './controllers';
import { mercadoPagoSdkProvider } from './providers/mercadopago';
import { GetPaymentService, PaymentFacadeService, PaymentService } from './services';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [PaymentController],
  providers: [mercadoPagoSdkProvider, PaymentService, PaymentFacadeService, GetPaymentService],
  exports: [PaymentService, PaymentFacadeService, GetPaymentService],
})
export class PaymentModule {}
