import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from '../../../../application/logs/services';
import { EventTypes } from '../../../../shared/events/event-types';
import { RentalEvents } from '../aluguel.events';
import { AluguelRegistrationRepository, AluguelRepository } from '../../repositories';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AluguelPaymentListener {
  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly aluguelRegistrationRepository: AluguelRegistrationRepository,
    private readonly logsService: LogsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(EventTypes.RENTAL_PAID)
  async handleRentalPaid(payload: {
    rentalId: string;
    paymentId: string;
    amount: number;
    userId?: string;
  }) {
    const rental = await this.aluguelRepository.update(payload.rentalId, {
      paymentStatus: 'APPROVED',
      paymentId: payload.paymentId,
    } as any);

    const bookings = await this.aluguelRegistrationRepository.findByRentalId(payload.rentalId);
    for (const booking of bookings) {
      if (booking.status === 'PENDING') {
        await this.aluguelRegistrationRepository.updateStatus(booking.id, 'ACTIVE');
      }
    }

    this.eventEmitter.emit(RentalEvents.PAYMENT_COMPLETED, {
      rentalId: payload.rentalId,
      paymentId: payload.paymentId,
      userId: payload.userId ?? rental.userId,
      amount: payload.amount,
      status: 'APPROVED',
      method: 'PIX',
      timestamp: new Date(),
      triggeredBy: 'payment-webhook',
    });

    this.logsService.info(
      'rental',
      'RentalWebhookPaymentCompleted',
      payload,
      payload.rentalId,
    );
  }

  @OnEvent(EventTypes.RENTAL_CANCELLED)
  async handleRentalPaymentCancelled(payload: {
    rentalId: string;
    paymentId: string;
    amount: number;
    userId?: string;
  }) {
    const rental = await this.aluguelRepository.update(payload.rentalId, {
      paymentStatus: 'CANCELLED',
      paymentId: payload.paymentId,
    } as any);

    const bookings = await this.aluguelRegistrationRepository.findByRentalId(payload.rentalId);
    for (const booking of bookings) {
      if (booking.status === 'PENDING' || booking.status === 'ACTIVE') {
        await this.aluguelRegistrationRepository.updateStatus(booking.id, 'CANCELLED');
      }
    }

    this.eventEmitter.emit(RentalEvents.PAYMENT_FAILED, {
      rentalId: payload.rentalId,
      paymentId: payload.paymentId,
      userId: payload.userId ?? rental.userId,
      amount: payload.amount,
      status: 'CANCELLED',
      method: 'PIX',
      timestamp: new Date(),
      triggeredBy: 'payment-webhook',
    });

    this.logsService.warn(
      'rental',
      'RentalWebhookPaymentCancelled',
      payload,
      payload.rentalId,
    );
  }
}

export { AluguelPaymentListener as RentalPaymentListener };
