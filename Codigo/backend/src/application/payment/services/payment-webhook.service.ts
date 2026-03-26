import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PaymentStatus as PrismaPaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { MercadoPagoWebhookDto } from '../dto';
import { PaymentAuthenticationException } from '../exceptions';
import { GetPaymentService } from './get-payment.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly getPaymentService: GetPaymentService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly loggerProvider: Logger,
  ) {}

  async processWebhook(
    signature: string,
    requestId: string,
    payload: MercadoPagoWebhookDto,
  ): Promise<void> {
    const safeRequestId = requestId || randomUUID();
    const isValid = this.validateSignature(signature, payload);
    if (!isValid) {
      throw new PaymentAuthenticationException('Invalid webhook signature');
    }

    this.loggerProvider.log(
      `Webhook received requestId=${safeRequestId} action=${payload.action} type=${payload.type}`,
    );
    this.loggerProvider.debug(
      `Webhook payload requestId=${safeRequestId}: ${JSON.stringify(payload)}`,
    );

    const existing = await this.prisma.paymentWebhookLog.findUnique({
      where: { requestId: safeRequestId },
    });
    if (existing) {
      this.loggerProvider.log(
        `Skipping duplicated webhook requestId=${safeRequestId}`,
      );
      return;
    }

    const externalPaymentIdRaw = payload.data?.id;
    const externalPaymentId = Number.parseInt(externalPaymentIdRaw, 10);
    const localPayment =
      Number.isNaN(externalPaymentId) || payload.type === 'merchant_order'
        ? null
        : await this.prisma.payment.findFirst({
            where: { externalId: externalPaymentId },
          });

    if (!localPayment) {
      this.loggerProvider.warn(
        `Webhook without mapped local payment requestId=${safeRequestId} type=${payload.type}`,
      );
      return;
    }

    const webhookLog = await this.prisma.paymentWebhookLog.create({
      data: {
        requestId: safeRequestId,
        paymentId: localPayment?.id ?? '00000000-0000-0000-0000-000000000000',
        action: payload.action,
        type: payload.type,
        payload: this.toJson(payload),
      },
    });

    this.eventEmitter.emit(EventTypes.PAYMENT_WEBHOOK_RECEIVED, {
      action: payload.action,
      data: payload.data,
      type: payload.type,
      dateCreated: payload.dateCreated,
    });

    setImmediate(async () => {
      try {
        if (payload.type === 'payment') {
          await this.handlePaymentNotification(payload.data.id);
        } else if (payload.type === 'chargebacks') {
          await this.updatePaymentStatus(externalPaymentId, 'charged_back');
        } else if (payload.type === 'merchant_order') {
          this.loggerProvider.log(
            `merchant_order webhook queued for future module handling requestId=${safeRequestId}`,
          );
        } else {
          this.loggerProvider.log(
            `Webhook type ${payload.type} not mapped yet requestId=${safeRequestId}`,
          );
        }

        await this.prisma.paymentWebhookLog.update({
          where: { id: webhookLog.id },
          data: {
            processedAt: new Date(),
          },
        });
      } catch (error) {
        this.loggerProvider.error(
          `Webhook processing failed requestId=${safeRequestId}`,
          error as Error,
        );
        await this.prisma.paymentWebhookLog.update({
          where: { id: webhookLog.id },
          data: {
            processedAt: new Date(),
            payload: this.toJson({
              ...payload,
              processingError:
                error instanceof Error ? error.message : 'Unknown webhook error',
            }),
          },
        });
      }
    });
  }

  private validateSignature(signature: string, payload: any): boolean {
    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      return true;
    }

    const digest = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (!signature) {
      return false;
    }

    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(digest, 'utf8');

    if (provided.length !== expected.length) {
      return false;
    }

    const valid = timingSafeEqual(provided, expected);
    return valid;
  }

  private async handlePaymentNotification(paymentId: string): Promise<void> {
    const externalId = Number.parseInt(paymentId, 10);
    if (Number.isNaN(externalId)) {
      this.loggerProvider.warn(`Invalid payment id in webhook: ${paymentId}`);
      return;
    }

    const latestPayment = await this.getPaymentService.execute(externalId);
    await this.updatePaymentStatus(externalId, latestPayment.status);
  }

  private async updatePaymentStatus(
    externalId: number,
    newStatus: string,
  ): Promise<void> {
    const localPayment = await this.prisma.payment.findFirst({
      where: { externalId: externalId },
    });
    if (!localPayment) {
      this.loggerProvider.warn(
        `No local payment found for external id ${externalId}`,
      );
      return;
    }

    if (localPayment.status === this.toPrismaStatus(newStatus)) {
      return;
    }

    this.loggerProvider.warn(
      `Payment status divergence external=${externalId} local=${localPayment.status} gateway=${newStatus}`,
    );

    await this.prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        status: this.toPrismaStatus(newStatus),
        statusDetail: newStatus,
      },
    });

    const basePayload = {
      paymentId: localPayment.id,
      externalPaymentId: externalId,
      domain: this.normalizeDomain(localPayment.domain),
      entityId: localPayment.entityId,
      timestamp: new Date(),
      triggeredBy: 'system.webhook',
    };

    if (newStatus === 'approved') {
      this.eventEmitter.emit(EventTypes.PAYMENT_APPROVED, {
        ...basePayload,
        amount: Number(localPayment.transactionAmount),
        netReceivedAmount: Number(localPayment.transactionAmount),
        dateApproved: new Date(),
      });
      this.emitDomainEvent(localPayment.domain, {
        entityId: localPayment.entityId,
        userId: localPayment.userId,
        id: localPayment.id,
        transactionAmount: Number(localPayment.transactionAmount),
      }, true);
    } else if (newStatus === 'rejected') {
      this.eventEmitter.emit(EventTypes.PAYMENT_REJECTED, {
        ...basePayload,
        statusDetail: newStatus,
        rejectionReason: newStatus,
      });
      this.emitDomainEvent(localPayment.domain, {
        entityId: localPayment.entityId,
        userId: localPayment.userId,
        id: localPayment.id,
        transactionAmount: Number(localPayment.transactionAmount),
      }, false);
    } else if (newStatus === 'cancelled') {
      this.eventEmitter.emit(EventTypes.PAYMENT_CANCELLED, basePayload);
      this.emitDomainEvent(localPayment.domain, {
        entityId: localPayment.entityId,
        userId: localPayment.userId,
        id: localPayment.id,
        transactionAmount: Number(localPayment.transactionAmount),
      }, false);
    } else if (newStatus === 'refunded') {
      this.eventEmitter.emit(EventTypes.PAYMENT_REFUNDED, {
        ...basePayload,
        refundedAmount: Number(localPayment.transactionAmount),
        originalAmount: Number(localPayment.transactionAmount),
      });
      this.emitDomainEvent(localPayment.domain, {
        entityId: localPayment.entityId,
        userId: localPayment.userId,
        id: localPayment.id,
        transactionAmount: Number(localPayment.transactionAmount),
      }, false);
    } else if (newStatus === 'charged_back') {
      this.eventEmitter.emit(EventTypes.PAYMENT_CHARGEBACK, basePayload);
      this.emitDomainEvent(localPayment.domain, {
        entityId: localPayment.entityId,
        userId: localPayment.userId,
        id: localPayment.id,
        transactionAmount: Number(localPayment.transactionAmount),
      }, false);
    } else if (newStatus === 'pending' || newStatus === 'in_process') {
      this.eventEmitter.emit(EventTypes.PAYMENT_PENDING, basePayload);
    }
  }

  private emitDomainEvent(
    domainRaw: string,
    payment: {
      entityId: string;
      userId: string;
      id: string;
      transactionAmount: number;
    },
    paid: boolean,
  ) {
    const basePayload = {
      timestamp: new Date(),
      triggeredBy: 'system.webhook',
      userId: payment.userId,
    };

    if (domainRaw === 'SALES') {
      this.eventEmitter.emit(
        paid ? EventTypes.ORDER_PAID : EventTypes.ORDER_CANCELLED,
        {
          ...basePayload,
          orderId: payment.entityId,
          paymentId: payment.id,
          amount: Number(payment.transactionAmount),
        },
      );
      return;
    }

    if (domainRaw === 'RENTAL') {
      this.eventEmitter.emit(
        paid ? EventTypes.RENTAL_PAID : EventTypes.RENTAL_CANCELLED,
        {
          ...basePayload,
          rentalId: payment.entityId,
          paymentId: payment.id,
          amount: Number(payment.transactionAmount),
        },
      );
      return;
    }

    if (domainRaw === 'HOSTING') {
      this.eventEmitter.emit(
        paid ? EventTypes.HOSTING_PAID : EventTypes.HOSTING_CANCELLED,
        {
          ...basePayload,
          hostingId: payment.entityId,
          paymentId: payment.id,
          amount: Number(payment.transactionAmount),
        },
      );
      return;
    }

    if (domainRaw === 'EVENT') {
      this.eventEmitter.emit(
        paid ? EventTypes.EVENT_PAID : EventTypes.EVENT_CANCELLED,
        {
          ...basePayload,
          eventId: payment.entityId,
          paymentId: payment.id,
          amount: Number(payment.transactionAmount),
        },
      );
    }
  }

  private normalizeDomain(
    domain: 'SALES' | 'RENTAL' | 'HOSTING' | 'EVENT',
  ): 'sales' | 'rental' | 'hosting' | 'event' {
    if (domain === 'SALES') {
      return 'sales';
    }
    if (domain === 'RENTAL') {
      return 'rental';
    }
    if (domain === 'EVENT') {
      return 'event';
    }
    return 'hosting';
  }

  private toPrismaStatus(status: string): PrismaPaymentStatus {
    if (status === 'approved') {
      return PrismaPaymentStatus.APPROVED;
    }
    if (status === 'authorized') {
      return PrismaPaymentStatus.AUTHORIZED;
    }
    if (status === 'in_process') {
      return PrismaPaymentStatus.IN_PROCESS;
    }
    if (status === 'in_mediation') {
      return PrismaPaymentStatus.IN_MEDIATION;
    }
    if (status === 'rejected') {
      return PrismaPaymentStatus.REJECTED;
    }
    if (status === 'cancelled') {
      return PrismaPaymentStatus.CANCELLED;
    }
    if (status === 'refunded') {
      return PrismaPaymentStatus.REFUNDED;
    }
    if (status === 'charged_back') {
      return PrismaPaymentStatus.CHARGED_BACK;
    }
    if (status === 'failed') {
      return PrismaPaymentStatus.FAILED;
    }
    return PrismaPaymentStatus.PENDING;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
