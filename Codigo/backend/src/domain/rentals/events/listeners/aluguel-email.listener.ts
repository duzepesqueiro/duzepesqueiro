import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../../../application/mail/services/mail.service';
import { LogsService } from '../../../../application/logs/services';
import {
  RentalBookingPayload,
  RentalPaymentPayload,
  RentalStatusPayload,
} from '../../../../shared/events/rental';
import { RentalEvents } from '../aluguel.events';

@Injectable()
export class AluguelEmailListener {
  constructor(
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
  ) {}

  @OnEvent(RentalEvents.BOOKING_CREATED)
  async handleBookingCreated(
    payload: Partial<RentalBookingPayload> & { booking?: { rentalId?: string } },
  ) {
    const rentalId = payload.rentalId ?? payload.booking?.rentalId;
    if (!payload.userEmail) {
      this.logsService.warn('rental', 'RentalBookingCreatedEmailSkipped', payload, rentalId);
      return;
    }
    const rentalNumber = payload.rentalDetails?.rentalNumber ?? rentalId ?? 'N/A';
    const startDate =
      payload.rentalDetails?.startDate ??
      payload.startDate?.toISOString() ??
      new Date().toISOString();
    const endDate =
      payload.rentalDetails?.endDate ??
      payload.endDate?.toISOString() ??
      new Date().toISOString();
    const total = payload.rentalDetails?.total ?? payload.value ?? 0;
    const items = payload.rentalDetails?.items ?? [];
    await this.mailService.sendRentalConfirmation({
      email: payload.userEmail,
      customerName: payload.userName ?? 'Cliente',
      rentalNumber,
      startDate,
      endDate,
      total,
      items,
    });
    this.logsService.info('rental', 'RentalBookingCreatedEmailSent', payload, rentalId);
  }

  @OnEvent(RentalEvents.STATUS_CHANGED)
  async handleReturnReminder(payload: RentalStatusPayload) {
    if (!payload.userEmail || payload.newStatus !== 'OVERDUE') {
      return;
    }
    await this.mailService.sendRentalReminder({
      email: payload.userEmail,
      customerName: payload.userName ?? 'Cliente',
      rentalNumber: payload.rentalId,
      startDate: payload.returnDate?.toISOString() ?? new Date().toISOString(),
      endDate: payload.returnDate?.toISOString() ?? new Date().toISOString(),
      total: 0,
      items: [],
    });
    this.logsService.info(
      'rental',
      'RentalReturnReminderEmailSent',
      payload as unknown as Record<string, unknown>,
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.PAYMENT_COMPLETED)
  async handlePaymentCompleted(payload: RentalPaymentPayload) {
    if (!payload.userEmail) {
      return;
    }
    await this.mailService.sendRentalReturnConfirmation({
      email: payload.userEmail,
      customerName: payload.userName,
      rentalNumber: payload.rentalId,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      total: payload.amount,
      items: [],
    });
    this.logsService.info(
      'rental',
      'RentalPaymentConfirmationEmailSent',
      payload as unknown as Record<string, unknown>,
      payload.rentalId,
    );
  }

  @OnEvent(RentalEvents.BOOKING_CANCELLED)
  async handleBookingCancelled(
    payload: Partial<RentalBookingPayload> & { booking?: { rentalId?: string } },
  ) {
    const rentalId = payload.rentalId ?? payload.booking?.rentalId;
    if (!payload.userEmail) {
      return;
    }
    await this.mailService.sendRentalCancellation({
      email: payload.userEmail,
      customerName: payload.userName ?? 'Cliente',
      rentalNumber: rentalId ?? 'N/A',
      startDate: payload.startDate?.toISOString() ?? new Date().toISOString(),
      endDate: payload.endDate?.toISOString() ?? new Date().toISOString(),
      total: 0,
      items: [],
    });
    this.logsService.info('rental', 'RentalBookingCancellationEmailSent', payload, rentalId);
  }
}
