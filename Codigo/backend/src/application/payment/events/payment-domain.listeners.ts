import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events';
import { MailService } from '../../mail/services/mail.service';
import { NotificationsGateway } from '../../notifications/gateways/notifications.gateway';
import {
  BasePaymentEventPayload,
  PaymentApprovedPayload,
  PaymentCancelledPayload,
  PaymentChargebackPayload,
  PaymentRefundedPayload,
  PaymentRejectedPayload,
} from './payment-event.payloads';

@Injectable()
export class PaymentDomainListeners {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly mailService: MailService,
    private readonly logger: Logger,
  ) {}

  @OnEvent(EventTypes.PAYMENT_APPROVED)
  async handlePaymentApproved(payload: PaymentApprovedPayload): Promise<void> {
    await this.runSafely('PAYMENT_APPROVED', payload, async () => {
      const isDuplicate = await this.isDuplicateEvent(payload, 'PAYMENT_APPROVED');
      if (isDuplicate) {
        return;
      }

      await this.emitDomainEvent(payload, true);
      await this.notifyUser(payload, 'payment:approved');
      await this.sendApprovalMail(payload);
      await this.markProcessed(payload, 'PAYMENT_APPROVED');
    });
  }

  @OnEvent(EventTypes.PAYMENT_REJECTED)
  async handlePaymentRejected(payload: PaymentRejectedPayload): Promise<void> {
    await this.runSafely('PAYMENT_REJECTED', payload, async () => {
      const isDuplicate = await this.isDuplicateEvent(payload, 'PAYMENT_REJECTED');
      if (isDuplicate) {
        return;
      }

      await this.emitDomainEvent(payload, false);
      await this.notifyUser(payload, 'payment:rejected');
      await this.markProcessed(payload, 'PAYMENT_REJECTED');
    });
  }

  @OnEvent(EventTypes.PAYMENT_CANCELLED)
  async handlePaymentCancelled(payload: PaymentCancelledPayload): Promise<void> {
    await this.runSafely('PAYMENT_CANCELLED', payload, async () => {
      const isDuplicate = await this.isDuplicateEvent(payload, 'PAYMENT_CANCELLED');
      if (isDuplicate) {
        return;
      }

      await this.emitDomainEvent(payload, false);
      await this.notifyUser(payload, 'payment:cancelled');
      await this.markProcessed(payload, 'PAYMENT_CANCELLED');
    });
  }

  @OnEvent(EventTypes.PAYMENT_REFUNDED)
  async handlePaymentRefunded(payload: PaymentRefundedPayload): Promise<void> {
    await this.runSafely('PAYMENT_REFUNDED', payload, async () => {
      const isDuplicate = await this.isDuplicateEvent(payload, 'PAYMENT_REFUNDED');
      if (isDuplicate) {
        return;
      }

      await this.emitDomainEvent(payload, false);
      await this.notifyUser(payload, 'payment:refunded');
      await this.markProcessed(payload, 'PAYMENT_REFUNDED');
    });
  }

  @OnEvent(EventTypes.PAYMENT_CHARGEBACK)
  async handlePaymentChargeback(payload: PaymentChargebackPayload): Promise<void> {
    await this.runSafely('PAYMENT_CHARGEBACK', payload, async () => {
      const isDuplicate = await this.isDuplicateEvent(payload, 'PAYMENT_CHARGEBACK');
      if (isDuplicate) {
        return;
      }

      await this.emitDomainEvent(payload, false);
      await this.notifyUser(payload, 'payment:chargeback');
      await this.markProcessed(payload, 'PAYMENT_CHARGEBACK');
    });
  }

  private async emitDomainEvent(
    payload: BasePaymentEventPayload,
    paid: boolean,
  ): Promise<void> {
    const userId = await this.resolveUserId(payload.paymentId);
    const basePayload = {
      paymentId: payload.paymentId,
      amount: (payload as any).amount ?? 0,
      timestamp: new Date(),
      triggeredBy: 'payment.domain.listeners',
      userId,
    };

    if (payload.domain === 'sales') {
      this.eventEmitter.emit(
        paid ? EventTypes.ORDER_PAID : EventTypes.ORDER_CANCELLED,
        {
          ...basePayload,
          orderId: payload.entityId,
        },
      );
      return;
    }

    if (payload.domain === 'rental') {
      this.eventEmitter.emit(
        paid ? EventTypes.RENTAL_PAID : EventTypes.RENTAL_CANCELLED,
        {
          ...basePayload,
          rentalId: payload.entityId,
        },
      );
      return;
    }

    this.eventEmitter.emit(
      paid ? EventTypes.HOSTING_PAID : EventTypes.HOSTING_CANCELLED,
      {
        ...basePayload,
        bookingId: payload.entityId,
        hostingId: payload.entityId,
      },
    );
  }

  private async notifyUser(
    payload: BasePaymentEventPayload,
    event: string,
  ): Promise<void> {
    const userId = await this.resolveUserId(payload.paymentId);
    this.notificationsGateway.sendToUser(userId, event, payload);
  }

  private async sendApprovalMail(payload: PaymentApprovedPayload): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
    });
    if (!payment) {
      return;
    }

    const customerName = payment.payerName ?? 'Cliente';
    if (payment.domain === 'SALES') {
      await this.mailService.sendOrderConfirmation({
        email: payment.payerEmail,
        customerName,
        orderNumber: payment.entityId,
        total: Number(payment.transactionAmount),
        items: [],
      });
      return;
    }

    if (payment.domain === 'RENTAL') {
      await this.mailService.sendRentalConfirmation({
        email: payment.payerEmail,
        customerName,
        rentalNumber: payment.entityId,
        startDate: '-',
        endDate: '-',
        total: Number(payment.transactionAmount),
        items: [],
      });
      return;
    }

    return;
  }

  private async resolveUserId(paymentId: string): Promise<string> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { userId: true },
    });
    return payment?.userId ?? '';
  }

  private async isDuplicateEvent(
    payload: BasePaymentEventPayload,
    eventName: string,
  ): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
      select: { metadata: true },
    });
    if (!payment) {
      return false;
    }

    const metadata = (payment.metadata as Record<string, unknown> | null) ?? {};
    const domainEvents = (metadata.domainEvents as Record<string, string> | undefined) ?? {};
    const key = `${eventName}:${payload.externalPaymentId}`;
    return Boolean(domainEvents[key]);
  }

  private async markProcessed(
    payload: BasePaymentEventPayload,
    eventName: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: payload.paymentId },
      select: { metadata: true },
    });
    if (!payment) {
      return;
    }

    const metadata = (payment.metadata as Record<string, unknown> | null) ?? {};
    const domainEvents = (metadata.domainEvents as Record<string, string> | undefined) ?? {};
    const key = `${eventName}:${payload.externalPaymentId}`;
    domainEvents[key] = new Date().toISOString();

    await this.prisma.payment.update({
      where: { id: payload.paymentId },
      data: {
        metadata: this.toJson({
          ...metadata,
          domainEvents,
        }),
      },
    });
  }

  private async runSafely(
    eventName: string,
    payload: BasePaymentEventPayload,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing ${eventName} paymentId=${payload.paymentId} domain=${payload.domain}`,
      );
      await fn();
    } catch (error) {
      this.logger.error(
        `Error on ${eventName} paymentId=${payload.paymentId}`,
        error as Error,
      );
    }
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
