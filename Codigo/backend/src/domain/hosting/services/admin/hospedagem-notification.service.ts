import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HostingNotificationStatus, Prisma } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import {
  HostingBookedCompanyMailPayload,
  HostingBookedMailPayload,
} from '../../../../application/mail/interfaces/mail-template-payloads.interface';
import { MailService } from '../../../../application/mail/services/mail.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class HospedagemNotificationService {
  private readonly logger = new Logger(HospedagemNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
  ) {}

  async enviarConfirmacaoReserva(reservaId: string): Promise<void> {
    this.logger.log(`Preparando e-mail de confirmação para reserva ${reservaId}.`);
    const reserva = await this.getReservaForNotification(reservaId);
    const customerEmail = this.resolveReservationEmail(reserva);
    const payload = this.buildHostingBookedPayload(reserva, customerEmail);
    this.logger.log(`Destinatário principal da reserva ${reservaId}: ${customerEmail}.`);

    await this.mailService.sendHostingBookedEmail(payload);
    await this.logNotification(reservaId, reserva.userId, 'BOOKING_CONFIRMED', customerEmail, 'SENT', {
      code: reserva.code,
      target: 'customer',
    });

    const companyEmail = this.resolveCompanyBookingEmail();
    if (companyEmail) {
      this.logger.log(`Enviando e-mail corporativo da reserva ${reservaId} para ${companyEmail}.`);
      await this.mailService.sendHostingBookedCompanyEmail(
        this.buildHostingBookedCompanyPayload(reserva, companyEmail),
      );
      await this.logNotification(
        reservaId,
        reserva.userId,
        'BOOKING_CONFIRMED',
        companyEmail,
        'SENT',
        {
          code: reserva.code,
          target: 'company',
        },
      );
    }

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
    const financialSummary = this.buildFinancialSummary(reserva);

    await this.mailService.sendHostingPaymentConfirmedEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorTotal: financialSummary.totalAmount.toFixed(2),
      quantidadeDiarias: financialSummary.nights,
      valorDiaria: financialSummary.dailyAmount.toFixed(2),
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
    const financialSummary = this.buildFinancialSummary(reserva);

    await this.mailService.sendHostingPaymentReminderEmail({
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      valorTotal: financialSummary.totalAmount.toFixed(2),
      quantidadeDiarias: financialSummary.nights,
      valorDiaria: financialSummary.dailyAmount.toFixed(2),
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
    const financialSummary = this.buildFinancialSummary(reserva);

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
      valorTotal: financialSummary.totalAmount.toFixed(2),
      quantidadeDiarias: financialSummary.nights,
      valorDiaria: financialSummary.dailyAmount.toFixed(2),
    });
    await this.logNotification(reservaId, reserva.userId, 'RESERVATION_COMPLETED', email, 'SENT', {
      totalAmount: Number(reserva.totalAmount),
    });
  }

  async enviarDetalhesVoucher(reservaId: string): Promise<void> {
    this.logger.log(`Preparando envio de voucher da reserva ${reservaId}.`);
    const reserva = await this.getReservaForNotification(reservaId);
    const email = this.resolveReservationEmail(reserva);
    const voucher = await this.getOrCreateVoucher(reservaId, reserva.code);
    this.logger.log(`Destinatário do voucher da reserva ${reservaId}: ${email}.`);

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
        guests: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            cpf: true,
            rg: true,
            birthDate: true,
            isPrimary: true,
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

  private buildHostingBookedPayload(reserva: any, email: string): HostingBookedMailPayload {
    const financialSummary = this.buildFinancialSummary(reserva);
    const halfAmount = financialSummary.totalAmount / 2;
    const guestList =
      Array.isArray(reserva.guests) && reserva.guests.length > 0
        ? reserva.guests.map((guest: { fullName: string }) => guest.fullName).filter(Boolean)
        : [reserva.guestName].filter(Boolean);

    return {
      email,
      customerName: reserva.guestName,
      codigoReserva: reserva.code,
      accommodationName: reserva.chalet.name,
      checkIn: this.toDateWithExpectedTime(reserva.checkInDate, this.getCheckinTime()),
      checkOut: this.toDateWithExpectedTime(reserva.checkOutDate, this.getCheckoutTime()),
      guests: reserva.adults + reserva.children,
      guestList,
      valorDiaria: financialSummary.dailyAmount.toFixed(2),
      total: financialSummary.totalAmount.toFixed(2),
      valorPagoApp: halfAmount.toFixed(2),
      valorRestanteCheckin: halfAmount.toFixed(2),
      politicaNoShow:
        'Não compareceu (no-show): não há devolução dos 50% pagos no ato da reserva.',
      politicaCancelamentoAte7:
        'Cancelou reserva antes de 7 dias: devolução de 50% sobre os 50% pagos no ato da reserva.',
      politicaCancelamento7a14:
        'Cancelou entre 7 e 14 dias: devolução de 25% sobre os 50% pagos no ato da reserva.',
      contactPhone: process.env.HOSTING_CONTACT_PHONE ?? '+55 (31) 99999-0000',
      contactWhatsApp: process.env.HOSTING_CONTACT_WHATSAPP ?? '+55 (31) 99999-0000',
      contactEmail: process.env.HOSTING_CONTACT_EMAIL ?? 'contato@duzepesqueiro.com',
    };
  }

  private buildHostingBookedCompanyPayload(
    reserva: any,
    email: string,
  ): HostingBookedCompanyMailPayload {
    const financialSummary = this.buildFinancialSummary(reserva);
    const halfAmount = financialSummary.totalAmount / 2;
    const guestDetails = Array.isArray(reserva.guests)
      ? reserva.guests.map(
          (guest: {
            fullName: string;
            email?: string | null;
            phone?: string | null;
            cpf?: string | null;
            rg?: string | null;
            birthDate?: Date | null;
            isPrimary?: boolean;
          }) => ({
            fullName: guest.fullName,
            email: guest.email ?? null,
            phone: guest.phone ?? null,
            cpf: guest.cpf ?? null,
            rg: guest.rg ?? null,
            birthDate: guest.birthDate ? this.toDateString(guest.birthDate) : null,
            isPrimary: Boolean(guest.isPrimary),
          }),
        )
      : [];
    const guestList =
      guestDetails.length > 0
        ? guestDetails.map((guest: { fullName: string }) => guest.fullName).filter(Boolean)
        : [reserva.guestName].filter(Boolean);

    return {
      email,
      codigoReserva: reserva.code,
      customerName: reserva.guestName,
      customerEmail: reserva.guestEmail ?? null,
      customerPhone: reserva.guestPhone ?? null,
      accommodationName: reserva.chalet.name,
      checkIn: this.toDateWithExpectedTime(reserva.checkInDate, this.getCheckinTime()),
      checkOut: this.toDateWithExpectedTime(reserva.checkOutDate, this.getCheckoutTime()),
      guests: reserva.adults + reserva.children,
      adults: reserva.adults,
      children: reserva.children,
      guestList,
      guestDetails,
      valorDiaria: financialSummary.dailyAmount.toFixed(2),
      total: financialSummary.totalAmount.toFixed(2),
      valorPagoApp: halfAmount.toFixed(2),
      valorRestanteCheckin: halfAmount.toFixed(2),
      paymentStatus: String(reserva.paymentStatus),
      paymentMethod: reserva.paymentMethod ?? null,
      reservationStatus: String(reserva.status),
      observacoes: reserva.notes ?? null,
    };
  }

  private resolveCompanyBookingEmail(): string | null {
    const username = process.env.MAIL_USERNAME?.trim();
    if (username?.includes('@')) {
      return username;
    }

    const user = process.env.MAIL_USER?.trim();
    if (user?.includes('@')) {
      return user;
    }

    const from = process.env.MAIL_FROM?.trim();
    if (!from) {
      return null;
    }
    const angleBracketMatch = from.match(/<([^>]+)>/);
    if (angleBracketMatch?.[1]) {
      return angleBracketMatch[1].trim();
    }
    const sanitized = from.replace(/^"|"$/g, '').trim();
    return sanitized.includes('@') ? sanitized : null;
  }

  private getCheckinTime(): string {
    return process.env.HOSTING_CHECKIN_TIME?.trim() || '14:00';
  }

  private getCheckoutTime(): string {
    return process.env.HOSTING_CHECKOUT_TIME?.trim() || '12:00';
  }

  private toDateWithExpectedTime(date: Date, expectedTime: string): string {
    return `${this.toDateString(date)} às ${expectedTime}`;
  }

  private toDateString(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
    }).format(date);
  }

  private calculateNights(checkInDate: Date, checkOutDate: Date): number {
    const msPerNight = 24 * 60 * 60 * 1000;
    const diff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / msPerNight);
    return Math.max(diff, 1);
  }

  private buildFinancialSummary(reserva: {
    checkInDate: Date;
    checkOutDate: Date;
    baseAmount?: Prisma.Decimal | number | string | null;
    totalAmount?: Prisma.Decimal | number | string | null;
  }): {
    nights: number;
    dailyAmount: number;
    baseAmount: number;
    totalAmount: number;
  } {
    const nights = this.calculateNights(reserva.checkInDate, reserva.checkOutDate);
    const totalAmount = Number(reserva.totalAmount ?? 0);
    const baseAmountRaw = Number(reserva.baseAmount ?? totalAmount);
    const baseAmount = Number.isFinite(baseAmountRaw) ? baseAmountRaw : totalAmount;
    const dailyAmount = nights > 0 ? baseAmount / nights : baseAmount;
    return {
      nights,
      dailyAmount,
      baseAmount,
      totalAmount,
    };
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
