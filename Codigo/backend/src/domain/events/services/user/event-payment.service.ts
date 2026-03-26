import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPaymentDomain, IPaymentMethod } from '../../../../application/payment/interfaces';
import { GetPaymentService, PaymentFacadeService } from '../../../../application/payment/services';
import { LogsService } from '../../../../application/logs/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EventEvents } from '../../../../shared/events/event-type';
import {
  EventRegistrationPaidPayload,
  EventRegisteredPayload,
  EventSoldOutPayload,
} from '../../../../shared/events/event-payload';
import {
  IPaymentIntent,
  IPaymentStatus,
  IPaymentWebhook,
} from '../../interfaces';
import { EventRegistrationRepository, EventRepository } from '../../repositories';
import { EventRegistrationStatus } from '../../interfaces/event-registration.interface';
import { createHmac } from 'crypto';

@Injectable()
export class EventPaymentService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly registrationRepository: EventRegistrationRepository,
    private readonly paymentFacadeService: PaymentFacadeService,
    private readonly getPaymentService: GetPaymentService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async initiateEventPayment(userId: string, eventId: string): Promise<IPaymentIntent> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }
    if (!event.isPaid) {
      throw new ConflictException('Este evento não requer pagamento');
    }
    if (!event.price || Number(event.price) <= 0) {
      throw new ConflictException('Evento pago sem preço válido configurado');
    }
    if (event.availableSlots <= 0) {
      throw new ConflictException('Não há vagas disponíveis para este evento');
    }

    const existing = await this.registrationRepository.findByUserAndEvent(userId, eventId);
    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException('Usuário já possui inscrição para este evento');
    }

    const user = await this.resolvePayer(userId);
    const registration = await this.registrationRepository.create({
      userId,
      eventId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    try {
      const payment = await this.paymentFacadeService.createEventPayment(
        registration.id,
        Number(event.price),
        IPaymentMethod.PIX,
        {
          email: user.email,
          name: user.name,
          document: user.document,
        },
        [
          {
            id: event.id,
            title: event.title,
            quantity: 1,
            unitPrice: Number(event.price),
          },
        ],
      );

      await this.registrationRepository.updatePaymentStatus(
        registration.id,
        'PENDING',
        payment.externalReference,
      );

      void this.logsService.info('events', 'EventPaymentInitiated', {
        userId,
        eventId,
        registrationId: registration.id,
        paymentId: String(payment.id),
        orderId: payment.externalReference,
      });

      return {
        paymentId: String(payment.id),
        checkoutUrl:
          payment.pointOfInteraction?.ticketUrl ??
          payment.pointOfInteraction?.qrCode ??
          '',
        amount: payment.transactionAmount,
        currency: payment.currencyId,
        expiresAt:
          payment.dateApproved ??
          new Date(Date.now() + 30 * 60 * 1000),
      };
    } catch (error) {
      await this.registrationRepository.delete(registration.id);
      throw error;
    }
  }

  async handlePaymentWebhook(payload: IPaymentWebhook): Promise<void> {
    this.validateWebhookSignature(payload);

    const requestId = this.buildWebhookRequestId(payload);
    const localPayment = await this.prisma.payment.findFirst({
      where: {
        externalReference: payload.orderId,
        domain: 'EVENT',
      },
    });
    if (!localPayment) {
      throw new NotFoundException('Pagamento do evento não encontrado');
    }

    const alreadyProcessed = await this.prisma.paymentWebhookLog.findUnique({
      where: { requestId },
      select: { id: true },
    });
    if (alreadyProcessed) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookLog.create({
        data: {
          paymentId: localPayment.id,
          requestId,
          action: 'event-webhook',
          type: payload.status,
          payload: payload as any,
        },
      });

      const registration = await tx.eventRegistration.findUnique({
        where: { id: localPayment.entityId },
      });
      if (!registration) {
        throw new NotFoundException('Inscrição vinculada ao pagamento não encontrada');
      }

      if (payload.status === 'PAID') {
        if (registration.paymentStatus === 'PAID') {
          return;
        }

        const event = await tx.event.findUnique({
          where: { id: registration.eventId },
          select: { id: true, availableSlots: true },
        });
        if (!event) {
          throw new NotFoundException('Evento da inscrição não encontrado');
        }
        if (event.availableSlots <= 0) {
          throw new ConflictException('Evento sem vagas disponíveis para confirmação');
        }

        await tx.eventRegistration.update({
          where: { id: registration.id },
          data: {
            status: 'PAID',
            paymentStatus: 'PAID',
            orderId: payload.orderId,
            confirmedAt: payload.paidAt ?? new Date(),
          },
        });

        await tx.event.update({
          where: { id: registration.eventId },
          data: {
            availableSlots: {
              decrement: 1,
            },
          },
        });
        return;
      }

      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: 'FAILED',
          status:
            payload.status === 'CANCELLED'
              ? ('CANCELLED' as EventRegistrationStatus)
              : registration.status,
          cancelledAt: payload.status === 'CANCELLED' ? new Date() : registration.cancelledAt,
        },
      });
    });

    const registration = await this.registrationRepository.findById(localPayment.entityId);
    const event = registration
      ? await this.eventRepository.findById(registration.eventId)
      : null;
    const user = registration ? await this.resolveUserSnapshot(registration.userId) : null;

    if (payload.status === 'PAID' && registration && event && user) {
      const paidPayload: EventRegistrationPaidPayload = {
        registration,
        event,
        user,
        amount: payload.amount,
        timestamp: payload.paidAt ?? new Date(),
      };
      this.eventEmitter.emit(EventEvents.REGISTRATION_PAID, paidPayload);

      if (event.availableSlots === 0) {
        const soldOutPayload: EventSoldOutPayload = {
          event,
          registration,
          timestamp: new Date(),
        };
        this.eventEmitter.emit(EventEvents.SOLD_OUT, soldOutPayload);
      }
    } else {
      this.eventEmitter.emit('event.payment.failed', {
        paymentId: payload.paymentId,
        orderId: payload.orderId,
        status: payload.status,
        timestamp: new Date(),
      });
    }

    void this.logsService.info('events', 'EventPaymentWebhookProcessed', {
      paymentId: payload.paymentId,
      orderId: payload.orderId,
      status: payload.status,
    });
  }

  async refundEventPayment(registrationId: string, reason: string): Promise<void> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }
    if (registration.paymentStatus !== 'PAID') {
      throw new ConflictException('A inscrição não está paga para reembolso');
    }

    await this.paymentFacadeService.refundPayment(
      IPaymentDomain.EVENT,
      registration.id,
      reason,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: 'REFUNDED',
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
      await tx.event.update({
        where: { id: registration.eventId },
        data: {
          availableSlots: {
            increment: 1,
          },
        },
      });
    });

    this.eventEmitter.emit('event.payment.refunded', {
      registrationId,
      reason,
      timestamp: new Date(),
    });
    void this.logsService.warn('events', 'EventPaymentRefunded', {
      registrationId,
      reason,
    });
  }

  async getPaymentStatus(registrationId: string): Promise<IPaymentStatus> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    let paymentId: string | null = null;
    let amount: number | null = null;
    let paidAt: Date | null = null;

    if (registration.orderId) {
      try {
        const payment = await this.getPaymentService.getByExternalReference(
          registration.orderId,
        );
        paymentId = String(payment.id);
        amount = payment.transactionAmount;
        paidAt = payment.dateApproved ?? null;
      } catch {
      }
    }

    return {
      registrationId,
      status: this.mapRegistrationStatus(registration.status, registration.paymentStatus),
      paymentStatus: registration.paymentStatus ?? null,
      orderId: registration.orderId ?? null,
      paymentId,
      amount,
      paidAt,
    };
  }

  private validateWebhookSignature(payload: IPaymentWebhook): void {
    const secret =
      this.configService.get<string>('payment.webhookSecret') ??
      this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('Webhook secret não configurado');
    }

    const message = `${payload.paymentId}:${payload.orderId}:${payload.status}:${payload.amount}`;
    const expected = createHmac('sha256', secret).update(message).digest('hex');
    if (expected !== payload.signature) {
      throw new BadRequestException('Assinatura de webhook inválida');
    }
  }

  private buildWebhookRequestId(payload: IPaymentWebhook): string {
    return `event-payment:${payload.paymentId}:${payload.orderId}:${payload.status}`;
  }

  private async resolvePayer(userId: string): Promise<{
    email: string;
    name: string;
    document: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        emails: {
          select: {
            email: true,
            isPrimary: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado para iniciar pagamento');
    }

    const email =
      user.emails.find((item) => item.isPrimary)?.email ?? user.emails[0]?.email;
    if (!email) {
      throw new BadRequestException('Usuário sem e-mail para pagamento');
    }

    return {
      email,
      name: user.profile?.fullName ?? user.username,
      document: user.profile?.document ?? '00000000000',
    };
  }

  private async resolveUserSnapshot(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        emails: {
          select: {
            email: true,
            isPrimary: true,
          },
        },
      },
    });
    if (!user) {
      return null;
    }
    const email =
      user.emails.find((item) => item.isPrimary)?.email ?? user.emails[0]?.email;
    if (!email) {
      return null;
    }
    return {
      id: user.id,
      email,
      name: user.profile?.fullName ?? user.username,
    };
  }

  private mapRegistrationStatus(
    registrationStatus: string,
    paymentStatus: string | null | undefined,
  ): IPaymentStatus['status'] {
    if (paymentStatus === 'REFUNDED') {
      return 'REFUNDED';
    }
    if (paymentStatus === 'PAID' || registrationStatus === 'PAID') {
      return 'PAID';
    }
    if (registrationStatus === 'CANCELLED') {
      return 'CANCELLED';
    }
    if (paymentStatus === 'FAILED') {
      return 'FAILED';
    }
    return 'PENDING';
  }
}
