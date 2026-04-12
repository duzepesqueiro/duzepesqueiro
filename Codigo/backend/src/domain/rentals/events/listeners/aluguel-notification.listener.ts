import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../../../../application/notifications/services/notifications.service';
import { LogsService } from '../../../../application/logs/services';
import {
  RentalBookingPayload,
  RentalPaymentPayload,
  RentalStatusPayload,
} from '../../../../shared/events/rental';
import { RentalEvents } from '../aluguel.events';

@Injectable()
export class AluguelNotificationListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly logsService: LogsService,
  ) {}

  @OnEvent(RentalEvents.BOOKING_CREATED)
  handleBookingCreated(payload: Partial<RentalBookingPayload> & { booking?: { rentalId?: string } }) {
    const rentalId = payload.rentalId ?? payload.booking?.rentalId;
    if (!payload.userId) {
      return;
    }
    this.notificationsService.sendToUser(payload.userId, 'rental.booking_created', {
      type: 'rental_booking_created',
      title: 'Reserva criada',
      message: `Sua reserva #${rentalId} foi criada com sucesso`,
      payload,
    });
    this.logsService.info('rental', 'RentalBookingCreatedNotificationSent', payload, rentalId);
  }

  @OnEvent(RentalEvents.STATUS_CHANGED)
  handleStatusChanged(payload: RentalStatusPayload) {
    if (!payload.userId) {
      return;
    }
    this.notificationsService.sendToUser(payload.userId, 'rental.status_changed', {
      type: 'rental_status_update',
      title: 'Status do Aluguel Atualizado',
      message: `Seu aluguel #${payload.rentalId} agora está ${payload.newStatus}`,
      payload,
    });
    this.logsService.info(
      'rental',
      'RentalStatusChangedNotificationSent',
      payload as unknown as Record<string, unknown>,
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.PAYMENT_COMPLETED)
  handlePaymentCompleted(payload: RentalPaymentPayload) {
    if (!payload.userId) {
      return;
    }
    this.notificationsService.sendToUser(payload.userId, 'rental.payment_completed', {
      type: 'rental_payment_completed',
      title: 'Pagamento confirmado',
      message: `Pagamento do aluguel #${payload.rentalId} confirmado`,
      payload,
    });
    this.logsService.info(
      'rental',
      'RentalPaymentCompletedNotificationSent',
      payload as unknown as Record<string, unknown>,
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.PAYMENT_FAILED)
  handlePaymentFailed(payload: RentalPaymentPayload) {
    if (!payload.userId) {
      return;
    }
    this.notificationsService.sendToUser(payload.userId, 'rental.payment_failed', {
      type: 'rental_payment_failed',
      title: 'Falha no pagamento',
      message: `Não foi possível confirmar o pagamento do aluguel #${payload.rentalId}`,
      payload,
    });
    this.logsService.warn(
      'rental',
      'RentalPaymentFailedNotificationSent',
      payload as unknown as Record<string, unknown>,
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.BOOKING_COMPLETED)
  handleUpcomingReturn(payload: Partial<RentalBookingPayload> & { booking?: { rentalId?: string } }) {
    const rentalId = payload.rentalId ?? payload.booking?.rentalId;
    if (!payload.userId) {
      return;
    }
    this.notificationsService.sendToUser(payload.userId, 'rental.booking_completed', {
      type: 'rental_booking_completed',
      title: 'Devolução registrada',
      message: `A devolução da reserva #${rentalId} foi registrada`,
      payload,
    });
    this.logsService.info('rental', 'RentalBookingCompletedNotificationSent', payload, rentalId);
  }
}
