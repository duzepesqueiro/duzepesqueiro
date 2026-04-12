import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../../shared/events';
import { NotificationsGateway } from '../../notifications/gateways/notifications.gateway';
import {
  BasePaymentEventPayload,
  PaymentApprovedPayload,
  PaymentCreatedPayload,
  PaymentRefundedPayload,
  PaymentRejectedPayload,
  PaymentWebhookPayload,
} from './payment-event.payloads';
import { IPaymentDomain } from '../interfaces';

@Injectable()
export class PaymentEventListeners {
  private readonly logger = new Logger(PaymentEventListeners.name);

  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  @OnEvent(EventTypes.PAYMENT_CREATED)
  handlePaymentCreated(payload: PaymentCreatedPayload) {
    this.logger.log(`Payment created: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:created', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_CREATED');
  }

  @OnEvent(EventTypes.PAYMENT_APPROVED)
  handlePaymentApproved(payload: PaymentApprovedPayload) {
    this.logger.log(`Payment approved: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:approved', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_APPROVED');
  }

  @OnEvent(EventTypes.PAYMENT_PENDING)
  handlePaymentPending(payload: BasePaymentEventPayload) {
    this.logger.log(`Payment pending: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:pending', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_PENDING');
  }

  @OnEvent(EventTypes.PAYMENT_REJECTED)
  handlePaymentRejected(payload: PaymentRejectedPayload) {
    this.logger.warn(`Payment rejected: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:rejected', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_REJECTED');
  }

  @OnEvent(EventTypes.PAYMENT_CANCELLED)
  handlePaymentCancelled(payload: BasePaymentEventPayload) {
    this.logger.warn(`Payment cancelled: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:cancelled', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_CANCELLED');
  }

  @OnEvent(EventTypes.PAYMENT_REFUNDED)
  handlePaymentRefunded(payload: PaymentRefundedPayload) {
    this.logger.warn(`Payment refunded: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:refunded', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_REFUNDED');
  }

  @OnEvent(EventTypes.PAYMENT_CHARGEBACK)
  handlePaymentChargeback(payload: BasePaymentEventPayload) {
    this.logger.warn(`Payment chargeback: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins('payment:chargeback', payload);
    this.updateRelatedEntityStatus(payload, 'PAYMENT_CHARGEBACK');
  }

  @OnEvent(EventTypes.PAYMENT_WEBHOOK_RECEIVED)
  handlePaymentWebhookReceived(payload: PaymentWebhookPayload) {
    this.logger.log(`Payment webhook received: ${payload.action}`);
    this.notificationsGateway.sendToAdmins('payment:webhook:received', payload);
  }

  @OnEvent(EventTypes.PAYMENT_RECONCILIATION_NEEDED)
  handlePaymentReconciliationNeeded(payload: BasePaymentEventPayload) {
    this.logger.warn(`Payment reconciliation needed: ${payload.paymentId}`);
    this.notificationsGateway.sendToAdmins(
      'payment:reconciliation:needed',
      payload,
    );
    this.updateRelatedEntityStatus(payload, 'PAYMENT_RECONCILIATION_NEEDED');
  }

  private updateRelatedEntityStatus(
    payload: BasePaymentEventPayload,
    paymentStatus: string,
  ) {
    switch (payload.domain) {
      case IPaymentDomain.SALES:
        this.logger.log(
          `Order ${payload.entityId} updated with payment status ${paymentStatus}`,
        );
        break;
      case IPaymentDomain.RENTAL:
        this.logger.log(
          `Rental ${payload.entityId} updated with payment status ${paymentStatus}`,
        );
        break;
      case IPaymentDomain.HOSTING:
        this.logger.log(
          `Booking ${payload.entityId} updated with payment status ${paymentStatus}`,
        );
        break;
      default:
        this.logger.warn(
          `Unknown payment domain for entity ${payload.entityId} and payment ${payload.paymentId}`,
        );
    }
  }
}
