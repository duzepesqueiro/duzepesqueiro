import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HostingNotificationStatus, Prisma } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { MailService } from '../../../../application/mail/services/mail.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class HospedagemNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
  ) {}

  async enviarConfirmacaoReserva(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingBookedEmail({
      email,
      customerName: reserva.guestName,
      accommodationName: reserva.chalet.name,
      checkIn: this.toDateTimeString(reserva.checkInDate),
      checkOut: this.toDateTimeString(reserva.checkOutDate),
      guests: reserva.adults + reserva.children,
      total: Number(reserva.totalAmount).toFixed(2),
    });
    await this.logNotification(reservaId, reserva.userId, 'BOOKING_CONFIRMED', email, 'SENT', {
      code: reserva.code,
    });

    await this.enviarDetalhesVoucher(reservaId);
  }

  async enviarLembreteCheckin(reservaId: string, horasAntes: number): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingReminder1Day({
      email,
      customerName: reserva.guestName,
      accommodationName: reserva.chalet.name,
      checkIn: this.toDateTimeString(reserva.checkInDate),
      checkOut: this.toDateTimeString(reserva.checkOutDate),
      address: 'Complexo DuZé Pesqueiro',
    });
    await this.logNotification(reservaId, reserva.userId, 'CHECKIN_REMINDER', email, 'SENT', {
      hoursBefore: horasAntes,
      checkInDate: reserva.checkInDate.toISOString(),
    });
  }

  async enviarConfirmacaoPagamento(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingPaymentConfirmedEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorTotal: Number(reserva.totalAmount).toFixed(2),
      metodoPagamento: reserva.paymentMethod ?? undefined,
    });
    await this.logNotification(reservaId, reserva.userId, 'PAYMENT_CONFIRMED', email, 'SENT', {
      paymentId: reserva.paymentId,
      amount: Number(reserva.totalAmount),
    });
  }

  async enviarNotificacaoCancelamento(reservaId: string, multa?: number): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);
    const multaCalculada = multa ?? 0;
    const reembolso = Number((Number(reserva.totalAmount) - multaCalculada).toFixed(2));

    await this.mailService.sendHostingCancellationEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      motivo: reserva.cancellationReason ?? undefined,
      valorMulta: multaCalculada.toFixed(2),
      valorReembolso: reembolso.toFixed(2),
      regraPolitica:
        multaCalculada === 0
          ? 'Cancelamento gratuito com antecedência de 14 dias ou mais'
          : multaCalculada <= Number(reserva.totalAmount) * 0.2 + 0.01
            ? 'Multa de 20% entre 7 e 13 dias'
            : 'Multa de 50% com menos de 7 dias',
    });
    await this.logNotification(reservaId, reserva.userId, 'CANCELLATION_NOTICE', email, 'SENT', {
      penaltyAmount: multaCalculada,
      refundAmount: reembolso,
    });
  }

  async enviarNotificacaoNoShow(reservaId: string, valorCobrado: number): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingNoShowEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorCobrado: valorCobrado.toFixed(2),
    });
    await this.logNotification(reservaId, reserva.userId, 'NO_SHOW_NOTICE', email, 'SENT', {
      chargedAmount: valorCobrado,
    });
  }

  async enviarLembretePagamento(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingPaymentReminderEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorTotal: Number(reserva.totalAmount).toFixed(2),
      checkIn: this.toDateTimeString(reserva.checkInDate),
      checkOut: this.toDateTimeString(reserva.checkOutDate),
    });
    await this.logNotification(reservaId, reserva.userId, 'PAYMENT_REMINDER', email, 'SENT', {
      paymentStatus: reserva.paymentStatus,
      paymentId: reserva.paymentId,
    });
  }

  async agendarNotificacoesReserva(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);
    const reminderDate = new Date(reserva.checkInDate.getTime() - 24 * 60 * 60 * 1000);

    await this.logNotification(reservaId, reserva.userId, 'CHECKIN_REMINDER_SCHEDULED', email, 'PENDING', {
      scheduledTo: reminderDate.toISOString(),
      checkInDate: reserva.checkInDate.toISOString(),
    }, reminderDate);

    if (reminderDate <= new Date()) {
      await this.enviarLembreteCheckin(reservaId, 24);
    }
  }

  async enviarNotificacaoCheckin(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingCheckinEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      checkinRealizadoEm: this.toDateTimeString(reserva.checkedInAt ?? new Date()),
    });
    await this.logNotification(reservaId, reserva.userId, 'CHECKIN_CONFIRMED', email, 'SENT', {
      checkedInAt: (reserva.checkedInAt ?? new Date()).toISOString(),
    });
  }

  async enviarNotificacaoCheckoutEConclusao(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);

    await this.mailService.sendHostingCheckoutEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      checkoutRealizadoEm: this.toDateTimeString(reserva.checkedOutAt ?? new Date()),
    });
    await this.logNotification(reservaId, reserva.userId, 'CHECKOUT_CONFIRMED', email, 'SENT', {
      checkedOutAt: (reserva.checkedOutAt ?? new Date()).toISOString(),
    });

    await this.mailService.sendHostingCompletedEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorTotal: Number(reserva.totalAmount).toFixed(2),
    });
    await this.logNotification(reservaId, reserva.userId, 'RESERVATION_COMPLETED', email, 'SENT', {
      totalAmount: Number(reserva.totalAmount),
    });
  }

  async enviarDetalhesVoucher(reservaId: string): Promise<void> {
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);
    const voucher = await this.getOrCreateVoucher(reservaId, reserva.code);

    await this.mailService.sendHostingVoucherEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      qrCode: voucher.qrCode,
      checkIn: this.toDateTimeString(reserva.checkInDate),
      checkOut: this.toDateTimeString(reserva.checkOutDate),
      accommodationName: reserva.chalet.name,
      instrucoesChegada: voucher.arrivalInstructions ?? undefined,
      contatos: voucher.complexContacts ?? undefined,
    });
    await this.logNotification(reservaId, reserva.userId, 'VOUCHER_DETAILS', email, 'SENT', {
      voucherId: voucher.id,
      qrCode: voucher.qrCode,
    });
  }

  private async getReservaForNotification(reservaId: string) {
    const reserva = await this.prisma.hostingReservation.findFirst({
      where: {
        id: reservaId,
        deletedAt: null,
      },
      include: {
        chalet: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            emails: {
              select: {
                email: true,
                isPrimary: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    return reserva;
  }

  private resolveReservationEmail(reserva: {
    guestEmail: string | null;
    guestName: string;
    user?: {
      emails: Array<{
        email: string;
        isPrimary: boolean;
        isVerified: boolean;
      }>;
    } | null;
  }): string {
    if (reserva.guestEmail) {
      return reserva.guestEmail;
    }

    const userEmails = Array.isArray(reserva.user?.emails) ? reserva.user.emails : [];
    const fallbackEmail =
      userEmails.find((item) => item.isPrimary)?.email ||
      userEmails.find((item) => item.isVerified)?.email ||
      userEmails[0]?.email;

    if (!fallbackEmail) {
      throw new BadRequestException('Reserva não possui e-mail para envio de notificação.');
    }

    return fallbackEmail;
  }

  private async getOrCreateVoucher(reservaId: string, reservaCode: string) {
    const existing = await this.prisma.hostingReservationVoucher.findFirst({
      where: { reservationId: reservaId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.hostingReservationVoucher.create({
      data: {
        reservationId: reservaId,
        qrCode: `${reservaCode}-${Math.floor(100000 + Math.random() * 900000)}`,
        arrivalInstructions: 'Apresente o código na recepção e confirme os dados dos hóspedes.',
        complexContacts: 'Recepção: +55 (31) 99999-0000',
      },
    });
  }

  private async logNotification(
    reservaId: string,
    userId: string | null,
    event: string,
    recipient: string,
    status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING',
    payload: Record<string, unknown>,
    nextRetryAt?: Date,
  ): Promise<void> {
    await this.prisma.hostingNotificationLog.create({
      data: {
        reservationId: reservaId,
        userId: userId ?? undefined,
        channel: 'EMAIL',
        event,
        recipient,
        payload: payload as Prisma.InputJsonValue,
        status,
        attempts: 1,
        nextRetryAt,
        sentAt: status === 'SENT' ? new Date() : undefined,
      },
    });

    void this.logsService.info(
      'hosting',
      'HostingEmailNotificationDispatched',
      {
        reservationId: reservaId,
        event,
        recipient,
        status,
      },
      reservaId,
    );
  }

  async marcarTentativaFalhaNotificationLog(
    logId: string,
    attempts: number,
    errorMessage: string,
    nextRetryAt?: Date | null,
  ): Promise<void> {
    await this.prisma.hostingNotificationLog.update({
      where: { id: logId },
      data: {
        status:
          nextRetryAt && attempts < 3
            ? HostingNotificationStatus.RETRYING
            : HostingNotificationStatus.FAILED,
        attempts,
        lastAttemptAt: new Date(),
        nextRetryAt: nextRetryAt ?? null,
        errorMessage,
      },
    });
  }

  private toDateTimeString(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
