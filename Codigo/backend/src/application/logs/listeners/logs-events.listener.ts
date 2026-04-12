import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../../shared/events';
import { LogsService } from '../services/logs.service';

@Injectable()
export class LogsEventsListener {
  constructor(private readonly logsService: LogsService) {}

  @OnEvent(EventTypes.USER_REGISTERED)
  async onUserRegistered(payload: any): Promise<void> {
    await this.logsService.info('auth', 'UserRegistered', payload, payload?.userId);
  }

  @OnEvent(EventTypes.USER_ACTIVATED)
  async onUserActivated(payload: any): Promise<void> {
    await this.logsService.info('auth', 'UserActivated', payload, payload?.userId);
  }

  @OnEvent(EventTypes.USER_DEACTIVATED)
  async onUserDeactivated(payload: any): Promise<void> {
    await this.logsService.warn('auth', 'UserDeactivated', payload, payload?.userId);
  }

  @OnEvent(EventTypes.USER_PASSWORD_RESET)
  async onUserPasswordReset(payload: any): Promise<void> {
    await this.logsService.info('auth', 'UserPasswordReset', payload, payload?.userId);
  }

  @OnEvent(EventTypes.ORDER_CREATED)
  async onOrderCreated(payload: any): Promise<void> {
    await this.logsService.info('sales', 'OrderCreated', payload, payload?.orderId);
  }

  @OnEvent(EventTypes.ORDER_PAID)
  async onOrderPaid(payload: any): Promise<void> {
    await this.logsService.info('sales', 'OrderPaid', payload, payload?.orderId);
  }

  @OnEvent(EventTypes.ORDER_CANCELLED)
  async onOrderCancelled(payload: any): Promise<void> {
    await this.logsService.warn('sales', 'OrderCancelled', payload, payload?.orderId);
  }

  @OnEvent(EventTypes.ORDER_COMPLETED)
  async onOrderCompleted(payload: any): Promise<void> {
    await this.logsService.info('sales', 'OrderCompleted', payload, payload?.orderId);
  }

  @OnEvent(EventTypes.RENTAL_CREATED)
  async onRentalCreated(payload: any): Promise<void> {
    await this.logsService.info('rental', 'RentalCreated', payload, payload?.rentalId);
  }

  @OnEvent(EventTypes.RENTAL_APPROVED)
  async onRentalApproved(payload: any): Promise<void> {
    await this.logsService.info('rental', 'RentalApproved', payload, payload?.rentalId);
  }

  @OnEvent(EventTypes.RENTAL_CANCELLED)
  async onRentalCancelled(payload: any): Promise<void> {
    await this.logsService.warn('rental', 'RentalCancelled', payload, payload?.rentalId);
  }

  @OnEvent(EventTypes.RENTAL_PAID)
  async onRentalPaid(payload: any): Promise<void> {
    await this.logsService.info('rental', 'RentalPaid', payload, payload?.rentalId);
  }

  @OnEvent(EventTypes.RENTAL_RETURNED)
  async onRentalReturned(payload: any): Promise<void> {
    await this.logsService.info('rental', 'RentalReturned', payload, payload?.rentalId);
  }

  @OnEvent(EventTypes.EVENT_BOOKED)
  async onEventBooked(payload: any): Promise<void> {
    await this.logsService.info('events', 'EventBooked', payload, payload?.eventId);
  }

  @OnEvent(EventTypes.EVENT_PAID)
  async onEventPaid(payload: any): Promise<void> {
    await this.logsService.info('events', 'EventPaid', payload, payload?.eventId);
  }

  @OnEvent(EventTypes.EVENT_CANCELLED)
  async onEventCancelled(payload: any): Promise<void> {
    await this.logsService.warn('events', 'EventCancelled', payload, payload?.eventId);
  }

  @OnEvent(EventTypes.HOSTING_BOOKED)
  async onHostingBooked(payload: any): Promise<void> {
    await this.logsService.info('hosting', 'HostingBooked', payload, payload?.hostingId);
  }

  @OnEvent(EventTypes.HOSTING_PAID)
  async onHostingPaid(payload: any): Promise<void> {
    await this.logsService.info('hosting', 'HostingPaid', payload, payload?.hostingId);
  }

  @OnEvent(EventTypes.HOSTING_CANCELLED)
  async onHostingCancelled(payload: any): Promise<void> {
    await this.logsService.warn('hosting', 'HostingCancelled', payload, payload?.hostingId);
  }

  @OnEvent(EventTypes.HOSTING_CHECKIN)
  async onHostingCheckin(payload: any): Promise<void> {
    await this.logsService.info('hosting', 'HostingCheckin', payload, payload?.hostingId);
  }

  @OnEvent(EventTypes.HOSTING_CHECKOUT)
  async onHostingCheckout(payload: any): Promise<void> {
    await this.logsService.info('hosting', 'HostingCheckout', payload, payload?.hostingId);
  }

  @OnEvent(EventTypes.PAYMENT_CREATED)
  async onPaymentCreated(payload: any): Promise<void> {
    await this.logsService.info('payment', 'PaymentCreated', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_APPROVED)
  async onPaymentApproved(payload: any): Promise<void> {
    await this.logsService.info('payment', 'PaymentApproved', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_PENDING)
  async onPaymentPending(payload: any): Promise<void> {
    await this.logsService.info('payment', 'PaymentPending', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_REJECTED)
  async onPaymentRejected(payload: any): Promise<void> {
    await this.logsService.warn('payment', 'PaymentRejected', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_CANCELLED)
  async onPaymentCancelled(payload: any): Promise<void> {
    await this.logsService.warn('payment', 'PaymentCancelled', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_REFUNDED)
  async onPaymentRefunded(payload: any): Promise<void> {
    await this.logsService.info('payment', 'PaymentRefunded', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_CHARGEBACK)
  async onPaymentChargeback(payload: any): Promise<void> {
    await this.logsService.error('payment', 'PaymentChargeback', payload, payload?.paymentId);
  }

  @OnEvent(EventTypes.PAYMENT_WEBHOOK_RECEIVED)
  async onPaymentWebhookReceived(payload: any): Promise<void> {
    await this.logsService.info('payment', 'PaymentWebhookReceived', payload);
  }

  @OnEvent(EventTypes.PAYMENT_RECONCILIATION_NEEDED)
  async onPaymentReconciliationNeeded(payload: any): Promise<void> {
    await this.logsService.warn(
      'payment',
      'PaymentReconciliationNeeded',
      payload,
      payload?.paymentId,
    );
  }

  @OnEvent(EventTypes.INVENTORY_UPDATED)
  async onInventoryUpdated(payload: any): Promise<void> {
    await this.logsService.info(
      'inventory',
      'InventoryUpdated',
      payload,
      payload?.productId,
    );
  }

  @OnEvent(EventTypes.INVENTORY_LOW_STOCK)
  async onInventoryLowStock(payload: any): Promise<void> {
    await this.logsService.warn(
      'inventory',
      'InventoryLowStock',
      payload,
      payload?.productId,
    );
  }

  @OnEvent(EventTypes.NOTIFICATION_SEND)
  async onNotificationSend(payload: any): Promise<void> {
    await this.logsService.info('mail', 'NotificationSend', payload, payload?.userId);
  }
}
