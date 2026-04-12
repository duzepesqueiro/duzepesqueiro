import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from '../../../../application/logs/services';
import {
  RentalBookingPayload,
  RentalPaymentPayload,
  RentalStatusPayload,
} from '../../../../shared/events/rental';
import { RentalEvents } from '../aluguel.events';

@Injectable()
export class AluguelMetricsListener {
  private readonly counters = {
    created: 0,
    statusChanged: 0,
    bookingCreated: 0,
    paymentCompleted: 0,
    paymentFailed: 0,
    deleted: 0,
  };

  constructor(private readonly logsService: LogsService) {}

  @OnEvent(RentalEvents.CREATED)
  onRentalCreated(payload: { rentalId?: string; aluguelId?: string; userId?: string }) {
    const rentalId = payload.rentalId ?? payload.aluguelId;
    this.counters.created += 1;
    this.logsService.info(
      'rental',
      'RentalCreated',
      { rentalId, userId: payload.userId, counters: this.counters },
      rentalId,
    );
  }

  @OnEvent(RentalEvents.BOOKING_CREATED)
  onBookingCreated(payload: RentalBookingPayload) {
    this.counters.bookingCreated += 1;
    this.logsService.info(
      'rental',
      'BookingCreated',
      {
        userId: payload.userId,
        rentalId: payload.rentalId,
        period: payload.period,
        value: payload.value,
        counters: this.counters,
      },
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.STATUS_CHANGED)
  onRentalStatusChanged(payload: RentalStatusPayload) {
    this.counters.statusChanged += 1;
    this.logsService.info(
      'rental',
      'StatusChanged',
      { ...payload, counters: this.counters },
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.PAYMENT_COMPLETED)
  onPaymentCompleted(payload: RentalPaymentPayload) {
    this.counters.paymentCompleted += 1;
    this.logsService.info(
      'rental',
      'PaymentCompleted',
      { ...payload, counters: this.counters },
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.PAYMENT_FAILED)
  onPaymentFailed(payload: RentalPaymentPayload) {
    this.counters.paymentFailed += 1;
    this.logsService.warn(
      'rental',
      'PaymentFailed',
      { ...payload, counters: this.counters },
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.DELETED)
  onRentalDeleted(payload: { rentalId?: string }) {
    this.counters.deleted += 1;
    this.logsService.warn(
      'rental',
      'RentalDeleted',
      { ...payload, counters: this.counters },
      payload.rentalId,
    );
  }
}

export { AluguelMetricsListener as RentalMetricsListener };
