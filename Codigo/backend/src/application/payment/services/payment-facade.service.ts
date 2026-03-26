import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreatePaymentDto,
  PayerDto,
  PaymentItemDto,
} from '../dto/create-payment.dto';
import { PaymentNotFoundException, PaymentValidationException } from '../exceptions';
import {
  IPaymentDomain as PaymentDomain,
  IPaymentMethod as PaymentMethod,
  IPaymentResponse,
} from '../interfaces';
import { CreatePaymentService } from './create-payment.service';
import { GetPaymentService } from './get-payment.service';
import { UpdatePaymentService } from './update-payment.service';

@Injectable()
export class PaymentFacadeService {
  private readonly logger = new Logger(PaymentFacadeService.name);

  constructor(
    private readonly createPaymentService: CreatePaymentService,
    private readonly getPaymentService: GetPaymentService,
    private readonly updatePaymentService: UpdatePaymentService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async createSalesPayment(
    orderId: string,
    amount: number,
    installments: number,
    paymentMethod: PaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
    cardToken?: string,
  ): Promise<IPaymentResponse> {
    const dto = this.buildCreatePaymentDto(
      PaymentDomain.SALES,
      orderId,
      amount,
      installments,
      paymentMethod,
      payer,
      items,
      cardToken,
    );
    const userId = await this.resolveUserIdFromPayer(payer);
    return this.createPaymentService.execute(dto, userId);
  }

  async createRentalPayment(
    rentalId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
    cardToken?: string,
  ): Promise<IPaymentResponse> {
    const dto = this.buildCreatePaymentDto(
      PaymentDomain.RENTAL,
      rentalId,
      amount,
      1,
      paymentMethod,
      payer,
      items,
      cardToken,
    );
    const userId = await this.resolveUserIdFromPayer(payer);
    return this.createPaymentService.execute(dto, userId);
  }

  async createHostingPayment(
    bookingId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
    cardToken?: string,
  ): Promise<IPaymentResponse> {
    const dto = this.buildCreatePaymentDto(
      PaymentDomain.HOSTING,
      bookingId,
      amount,
      1,
      paymentMethod,
      payer,
      items,
      cardToken,
    );
    const userId = await this.resolveUserIdFromPayer(payer);
    return this.createPaymentService.execute(dto, userId);
  }

  async createEventPayment(
    registrationId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
    cardToken?: string,
  ): Promise<IPaymentResponse> {
    this.logger.log(`Criando pagamento de evento para inscrição: ${registrationId}`);
    const dto = this.buildCreatePaymentDto(
      PaymentDomain.EVENT,
      registrationId,
      amount,
      1,
      paymentMethod,
      payer,
      items,
      cardToken,
    );
    const userId = await this.resolveUserIdFromPayer(payer);
    return this.createPaymentService.execute(dto, userId);
  }

  async checkPaymentStatus(
    domain: PaymentDomain,
    entityId: string,
  ): Promise<IPaymentResponse | null> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        domain: domain.toUpperCase() as any,
        entityId,
      },
      orderBy: {
        dateLastUpdated: 'desc',
      },
    });
    if (!payment) {
      return null;
    }

    return this.getPaymentService.getByInternalId(payment.id);
  }

  async cancelPayment(
    domain: PaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<IPaymentResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        domain: domain.toUpperCase() as any,
        entityId,
      },
      orderBy: {
        dateLastUpdated: 'desc',
      },
    });
    if (!payment?.externalId) {
      throw new PaymentNotFoundException(`${domain}_${entityId}`);
    }

    const result = await this.updatePaymentService.cancelPayment(
      payment.externalId,
      reason,
    );
    this.eventEmitter.emit('payment.facade.cancelled', {
      domain,
      entityId,
      reason,
      timestamp: new Date(),
    });
    return result;
  }

  async getPixData(paymentId: string): Promise<{
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl: string;
    expiresAt: Date;
  }> {
    const payment = await this.getPaymentService.getByInternalId(paymentId);
    if (!payment.pointOfInteraction?.qrCode || !payment.pointOfInteraction.qrCodeBase64) {
      throw new PaymentValidationException(
        'PIX data is not available for this payment',
        'PIX_DATA_NOT_AVAILABLE',
      );
    }

    const localPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    return {
      qrCode: payment.pointOfInteraction.qrCode,
      qrCodeBase64: payment.pointOfInteraction.qrCodeBase64,
      ticketUrl: payment.pointOfInteraction.ticketUrl ?? '',
      expiresAt:
        localPayment?.dateOfExpiration ??
        new Date(Date.now() + 30 * 60 * 1000),
    };
  }

  async refundPayment(
    domain: PaymentDomain,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Estornando pagamento para ${domain}:${entityId}`);
    const payment = await this.prisma.payment.findFirst({
      where: {
        domain: domain.toUpperCase() as any,
        entityId,
      },
      orderBy: {
        dateLastUpdated: 'desc',
      },
    });
    if (!payment?.externalId) {
      throw new PaymentNotFoundException(`${domain}_${entityId}`);
    }

    await this.updatePaymentService.execute(payment.externalId, {
      status: 'refunded',
      statusDetail: reason,
    });
    this.eventEmitter.emit('payment.facade.refunded', {
      domain,
      entityId,
      reason,
      timestamp: new Date(),
    });
  }

  private buildCreatePaymentDto(
    domain: PaymentDomain,
    entityId: string,
    transactionAmount: number,
    installments: number,
    paymentMethod: PaymentMethod,
    payer: PayerDto,
    items: PaymentItemDto[],
    cardToken?: string,
  ): CreatePaymentDto {
    return {
      domain,
      entityId,
      transactionAmount,
      installments,
      paymentMethodId: paymentMethod,
      token: cardToken,
      payer,
      items,
      externalReference: `${domain}_${entityId}`,
    };
  }

  private async resolveUserIdFromPayer(payer: PayerDto): Promise<string> {
    const userEmail = await this.prisma.userEmail.findUnique({
      where: { email: payer.email },
      select: { userId: true },
    });
    if (userEmail?.userId) {
      return userEmail.userId;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!fallbackUser) {
      throw new PaymentValidationException(
        'Unable to resolve user for payment creation',
        'PAYMENT_USER_NOT_FOUND',
      );
    }
    return fallbackUser.id;
  }
}
