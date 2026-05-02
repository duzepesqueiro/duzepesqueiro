import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  HostingNotificationChannel,
  HostingNotificationStatus,
  ReservationStatus,
} from '@prisma/client';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EventTypes } from '../../../shared/events/event-types';
import { HospedagemNotificationService } from '../services';

type BookingEventPayload = {
  reservationId?: string;
  bookingId?: string;
  hostingId?: string;
};

@Injectable()
export class ReservationNotificationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReservationNotificationJob.name);
  private midnightTimeout?: NodeJS.Timeout;
  private dailyInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: HospedagemNotificationService,
    private readonly logsService: LogsService,
  ) {}

  onModuleInit(): void {
    this.scheduleDailyProcessing();
  }

  onModuleDestroy(): void {
    if (this.midnightTimeout) {
      clearTimeout(this.midnightTimeout);
    }
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
    }
  }

  @OnEvent(EventTypes.HOSTING_PAID)
  async handleReservationPaid(event: BookingEventPayload): Promise<void> {
    const reservationId = event.reservationId ?? event.bookingId ?? event.hostingId;
    if (!reservationId) {
      this.logger.warn('Evento HOSTING_PAID recebido sem reservationId.');
      return;
    }
    this.logger.log(`Processando notificação pós-pagamento da reserva ${reservationId}.`);

    try {
      this.logger.log(`Enviando confirmação de pagamento da reserva ${reservationId}.`);
      await this.notificationService.enviarConfirmacaoPagamento(reservationId);
      this.logger.log(`Confirmação de pagamento enviada para ${reservationId}.`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar confirmação de pagamento da reserva ${reservationId}: ${this.toErrorMessage(error)}`,
      );
      await this.persistFailure(
        reservationId,
        HostingNotificationChannel.EMAIL,
        'PAYMENT_CONFIRMED',
        error,
      );
    }

    try {
      this.logger.log(`Enviando confirmação de reserva para ${reservationId}.`);
      await this.notificationService.enviarConfirmacaoReserva(reservationId);
      this.logger.log(`Confirmação de reserva enviada para ${reservationId}.`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar confirmação da reserva ${reservationId}: ${this.toErrorMessage(error)}`,
      );
      await this.persistFailure(
        reservationId,
        HostingNotificationChannel.EMAIL,
        'BOOKING_CONFIRMED',
        error,
      );
    }

    try {
      this.logger.log(`Agendando lembretes da reserva ${reservationId}.`);
      await this.notificationService.agendarNotificacoesReserva(reservationId);
      await this.scheduleWhatsAppReminder(reservationId);
      this.logger.log(`Lembretes da reserva ${reservationId} agendados.`);
    } catch (error) {
      this.logger.error(
        `Falha ao agendar lembretes da reserva ${reservationId}: ${this.toErrorMessage(error)}`,
      );
      await this.persistFailure(
        reservationId,
        HostingNotificationChannel.EMAIL,
        'CHECKIN_REMINDER_SCHEDULED',
        error,
      );
    }
  }

  async processarLembretesPendentes(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const logs = await this.prisma.hostingNotificationLog.findMany({
      where: {
        event: 'CHECKIN_REMINDER_SCHEDULED',
        status: {
          in: [HostingNotificationStatus.PENDING, HostingNotificationStatus.RETRYING],
        },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
        reservation: {
          deletedAt: null,
          status: {
            in: [
              ReservationStatus.PENDING,
              ReservationStatus.CONFIRMED,
              ReservationStatus.OCCUPIED,
            ],
          },
          checkInDate: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
      },
      include: {
        reservation: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ nextRetryAt: 'asc' }, { createdAt: 'asc' }],
    });

    for (const item of logs) {
      if (!item.reservationId || !item.reservation) {
        continue;
      }

      try {
        if (item.channel === HostingNotificationChannel.WHATSAPP) {
          throw new Error('Canal WhatsApp não implementado neste projeto.');
        }

        await this.notificationService.enviarLembreteCheckin(item.reservationId, 24);
        await this.prisma.hostingNotificationLog.update({
          where: { id: item.id },
          data: {
            status: HostingNotificationStatus.SENT,
            attempts: item.attempts + 1,
            sentAt: new Date(),
            lastAttemptAt: new Date(),
            errorMessage: null,
            nextRetryAt: null,
          },
        });
      } catch (error) {
        await this.markFailureWithRetry(item.id, item.attempts, error);
      }
    }
  }

  private scheduleDailyProcessing(): void {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    const initialDelay = Math.max(0, nextMidnight.getTime() - now.getTime());

    this.midnightTimeout = setTimeout(async () => {
      await this.processarLembretesPendentes();
      this.dailyInterval = setInterval(async () => {
        await this.processarLembretesPendentes();
      }, 24 * 60 * 60 * 1000);
    }, initialDelay);
  }

  private async scheduleWhatsAppReminder(reservationId: string): Promise<void> {
    const reserva = await this.prisma.hostingReservation.findFirst({
      where: {
        id: reservationId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        guestPhone: true,
        checkInDate: true,
      },
    });
    if (!reserva || !reserva.guestPhone) {
      return;
    }

    const reminderDate = new Date(reserva.checkInDate.getTime() - 24 * 60 * 60 * 1000);
    await this.prisma.hostingNotificationLog.create({
      data: {
        reservationId: reserva.id,
        userId: reserva.userId ?? undefined,
        channel: HostingNotificationChannel.WHATSAPP,
        event: 'CHECKIN_REMINDER_SCHEDULED',
        recipient: reserva.guestPhone,
        payload: {
          checkInDate: reserva.checkInDate.toISOString(),
          scheduledTo: reminderDate.toISOString(),
        },
        status: HostingNotificationStatus.PENDING,
        attempts: 0,
        nextRetryAt: reminderDate,
      },
    });
  }

  private async markFailureWithRetry(
    logId: string,
    attempts: number,
    error: unknown,
  ): Promise<void> {
    const maxAttempts = 3;
    const nextAttempts = attempts + 1;
    const retrying = nextAttempts < maxAttempts;
    const nextRetryAt = retrying
      ? new Date(Date.now() + 6 * 60 * 60 * 1000)
      : null;

    await this.prisma.hostingNotificationLog.update({
      where: { id: logId },
      data: {
        status: retrying
          ? HostingNotificationStatus.RETRYING
          : HostingNotificationStatus.FAILED,
        attempts: nextAttempts,
        lastAttemptAt: new Date(),
        nextRetryAt,
        errorMessage: this.toErrorMessage(error),
      },
    });
  }

  private async persistFailure(
    reservationId: string,
    channel: HostingNotificationChannel,
    event: string,
    error: unknown,
  ): Promise<void> {
    const reserva = await this.prisma.hostingReservation.findFirst({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        guestEmail: true,
      },
    });

    await this.prisma.hostingNotificationLog.create({
      data: {
        reservationId,
        userId: reserva?.userId ?? undefined,
        channel,
        event,
        recipient: reserva?.guestEmail ?? 'unknown',
        payload: {
          source: 'ReservationNotificationJob',
        },
        status: HostingNotificationStatus.FAILED,
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: this.toErrorMessage(error),
      },
    });

    void this.logsService.error(
      'hosting',
      'ReservationNotificationJobFailure',
      {
        reservationId,
        event,
        channel,
        error: this.toErrorMessage(error),
      },
      reservationId,
    );
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
