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
    void this.notificationsService.notifyUser({
      userId: payload.userId,
      source: 'rental',
      eventKey: 'rental.booking_created',
      title: 'Reserva criada',
      message: `Sua reserva #${rentalId} foi criada com sucesso`,
      type: 'SUCCESS',
      dedupKey: `rental.booking_created.${rentalId}`,
      payload: payload as Record<string, unknown>,
    });
    this.logsService.info('rental', 'RentalBookingCreatedNotificationSent', payload, rentalId);
  }

  @OnEvent(RentalEvents.STATUS_CHANGED)
  handleStatusChanged(payload: RentalStatusPayload) {
    if (!payload.userId) {
      return;
    }
    void this.notificationsService.notifyUser({
      userId: payload.userId,
      source: 'rental',
      eventKey: 'rental.status_changed',
      title: 'Status do aluguel atualizado',
      message: `Seu aluguel #${payload.rentalId} agora está ${payload.newStatus}`,
      type: 'INFO',
      dedupKey: `rental.status_changed.${payload.rentalId}.${payload.newStatus}`,
      payload: payload as unknown as Record<string, unknown>,
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
    void this.notificationsService.notifyUser({
      userId: payload.userId,
      source: 'rental',
      eventKey: 'rental.payment_completed',
      title: 'Pagamento confirmado',
      message: `Pagamento do aluguel #${payload.rentalId} confirmado`,
      type: 'SUCCESS',
      dedupKey: `rental.payment_completed.${payload.rentalId}`,
      payload: payload as unknown as Record<string, unknown>,
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
    void this.notificationsService.notifyUser({
      userId: payload.userId,
      source: 'rental',
      eventKey: 'rental.payment_failed',
      title: 'Falha no pagamento',
      message: `Não foi possível confirmar o pagamento do aluguel #${payload.rentalId}`,
      type: 'ERROR',
      dedupKey: `rental.payment_failed.${payload.rentalId}`,
      payload: payload as unknown as Record<string, unknown>,
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
    void this.notificationsService.notifyUser({
      userId: payload.userId,
      source: 'rental',
      eventKey: 'rental.booking_completed',
      title: 'Devolução registrada',
      message: `A devolução da reserva #${rentalId} foi registrada`,
      type: 'SUCCESS',
      dedupKey: `rental.booking_completed.${rentalId}`,
      payload: payload as Record<string, unknown>,
    });
    this.logsService.info('rental', 'RentalBookingCompletedNotificationSent', payload, rentalId);
  }
}
