import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ChaleStatus,
  HostingNotificationChannel,
  HostingNotificationStatus,
  ReservationStatus,
} from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HospedagemNotificationService } from '../services';

@Injectable()
export class AbandonedReservationCleanupJob implements OnModuleInit, OnModuleDestroy {
  private intervalRef?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: HospedagemNotificationService,
    private readonly logsService: LogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.executar();
    this.intervalRef = setInterval(async () => {
      await this.executar();
    }, 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  async executar(now = new Date()): Promise<void> {
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingToRemind = await this.prisma.hostingReservation.findMany({
      where: {
        deletedAt: null,
        status: ReservationStatus.PENDING,
        paidAt: null,
        createdAt: {
          lte: thirtyMinutesAgo,
        },
        paymentStatus: 'PENDING',
      },
      select: {
        id: true,
      },
    });

    for (const reserva of pendingToRemind) {
      await this.processarLembretePagamento(reserva.id);
    }

    const pendingToCancel = await this.prisma.hostingReservation.findMany({
      where: {
        deletedAt: null,
        status: ReservationStatus.PENDING,
        paidAt: null,
        createdAt: {
          lte: twentyFourHoursAgo,
        },
        paymentStatus: 'PENDING',
      },
      select: {
        id: true,
        chaletId: true,
      },
    });

    for (const reserva of pendingToCancel) {
      await this.cancelarReservaAbandonada(reserva.id);
      await this.liberarChaleSeNecessario(reserva.chaletId);
    }
  }

  private async processarLembretePagamento(reservaId: string): Promise<void> {
    const existingSent = await this.prisma.hostingNotificationLog.findFirst({
      where: {
        reservationId: reservaId,
        event: 'PAYMENT_REMINDER',
        channel: HostingNotificationChannel.EMAIL,
        status: HostingNotificationStatus.SENT,
      },
      select: { id: true },
    });

    if (existingSent) {
      return;
    }

    try {
      await this.notificationService.enviarLembretePagamento(reservaId);
      await this.registrarLembreteWhatsappNaoImplementado(reservaId);
    } catch (error) {
      const errorMessage = this.toErrorMessage(error);
      await this.prisma.hostingNotificationLog.create({
        data: {
          reservationId: reservaId,
          channel: HostingNotificationChannel.EMAIL,
          event: 'PAYMENT_REMINDER',
          recipient: 'unknown',
          status: HostingNotificationStatus.FAILED,
          attempts: 1,
          lastAttemptAt: new Date(),
          errorMessage,
          payload: {
            source: 'AbandonedReservationCleanupJob',
          },
        },
      });
      void this.logsService.error(
        'hosting',
        'AbandonedReservationPaymentReminderFailed',
        {
          reservationId: reservaId,
          error: errorMessage,
        },
        reservaId,
      );
    }
  }

  private async registrarLembreteWhatsappNaoImplementado(
    reservaId: string,
  ): Promise<void> {
    const existing = await this.prisma.hostingNotificationLog.findFirst({
      where: {
        reservationId: reservaId,
        event: 'PAYMENT_REMINDER',
        channel: HostingNotificationChannel.WHATSAPP,
      },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const reserva = await this.prisma.hostingReservation.findFirst({
      where: { id: reservaId },
      select: {
        userId: true,
        guestPhone: true,
      },
    });

    if (!reserva?.guestPhone) {
      return;
    }

    await this.prisma.hostingNotificationLog.create({
      data: {
        reservationId: reservaId,
        userId: reserva.userId ?? undefined,
        channel: HostingNotificationChannel.WHATSAPP,
        event: 'PAYMENT_REMINDER',
        recipient: reserva.guestPhone,
        status: HostingNotificationStatus.FAILED,
        attempts: 1,
        lastAttemptAt: new Date(),
        errorMessage: 'Canal WhatsApp ainda não implementado no sistema.',
        payload: {
          source: 'AbandonedReservationCleanupJob',
        },
      },
    });
  }

  private async cancelarReservaAbandonada(reservaId: string): Promise<void> {
    await this.prisma.hostingReservation.update({
      where: { id: reservaId },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Cancelada automaticamente por ausência de pagamento em 24h.',
        updatedAt: new Date(),
      },
    });
  }

  private async liberarChaleSeNecessario(chaletId: string): Promise<void> {
    const activeCount = await this.prisma.hostingReservation.count({
      where: {
        chaletId,
        deletedAt: null,
        status: {
          in: [
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.OCCUPIED,
          ],
        },
      },
    });

    if (activeCount > 0) {
      return;
    }

    await this.prisma.hostingChalet.updateMany({
      where: {
        id: chaletId,
        status: ChaleStatus.RESERVED,
      },
      data: {
        status: ChaleStatus.AVAILABLE,
      },
    });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
