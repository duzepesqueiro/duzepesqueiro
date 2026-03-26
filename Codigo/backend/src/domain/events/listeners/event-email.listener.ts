import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../../../application/mail/services/mail.service';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  EventRegisteredPayload,
  EventRegistrationCancelledPayload,
  EventSoldOutPayload,
} from '../../../shared/events/event-payload';
import { EventEvents } from '../../../shared/events/event-type';

@Injectable()
export class EventEmailListener {
  private readonly processed = new Map<string, number>();
  private readonly ttlMs = 10 * 60 * 1000;

  constructor(
    private readonly mailService: MailService,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(EventEvents.REGISTERED)
  async handleEventRegistration(payload: EventRegisteredPayload): Promise<void> {
    const key = `${EventEvents.REGISTERED}:${payload.registration.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      await this.mailService.sendEventBookingConfirmation({
        email: payload.user.email,
        customerName: payload.user.name,
        eventName: payload.event.title,
        eventDate: payload.event.eventDate.toISOString().split('T')[0],
        eventTime: payload.event.eventTime,
        guests: 1,
        total: payload.event.price ?? 0,
      });
      void this.logsService.info(
        'events',
        'EventRegistrationConfirmationEmailSent',
        { registrationId: payload.registration.id, eventId: payload.event.id },
        payload.event.id,
      );
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventRegistrationConfirmationEmailFailed',
        {
          registrationId: payload.registration.id,
          eventId: payload.event.id,
          error: error instanceof Error ? error.message : 'unknown',
        },
        payload.event.id,
      );
    }
  }

  @OnEvent(EventEvents.REGISTRATION_CANCELLED)
  async handleRegistrationCancelled(
    payload: EventRegistrationCancelledPayload,
  ): Promise<void> {
    const key = `${EventEvents.REGISTRATION_CANCELLED}:${payload.registration.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      await this.mailService.sendEventBookingConfirmation({
        email: payload.user.email,
        customerName: payload.user.name,
        eventName: `Cancelamento - ${payload.event.title}`,
        eventDate: payload.event.eventDate.toISOString().split('T')[0],
        eventTime: payload.event.eventTime,
        guests: 1,
        total: payload.event.price ?? 0,
      });
      void this.logsService.info(
        'events',
        'EventRegistrationCancelledEmailSent',
        { registrationId: payload.registration.id, eventId: payload.event.id },
        payload.event.id,
      );
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventRegistrationCancelledEmailFailed',
        {
          registrationId: payload.registration.id,
          eventId: payload.event.id,
          error: error instanceof Error ? error.message : 'unknown',
        },
        payload.event.id,
      );
    }
  }

  @OnEvent(EventEvents.SOLD_OUT)
  async handleEventSoldOut(payload: EventSoldOutPayload): Promise<void> {
    const key = `${EventEvents.SOLD_OUT}:${payload.event.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        include: {
          emails: {
            select: { email: true, isPrimary: true },
          },
          profile: true,
        },
      });

      await Promise.all(
        admins.map(async (admin) => {
          const email =
            admin.emails.find((item) => item.isPrimary)?.email ?? admin.emails[0]?.email;
          if (!email) {
            return;
          }
          await this.mailService.sendEventBookingConfirmation({
            email,
            customerName: admin.profile?.fullName ?? admin.username,
            eventName: `Evento Lotado - ${payload.event.title}`,
            eventDate: payload.event.eventDate.toISOString().split('T')[0],
            eventTime: payload.event.eventTime,
            guests: 0,
            total: payload.event.price ?? 0,
          });
        }),
      );
      void this.logsService.warn(
        'events',
        'EventSoldOutAdminAlertSent',
        { eventId: payload.event.id, adminCount: admins.length },
        payload.event.id,
      );
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventSoldOutAdminAlertFailed',
        {
          eventId: payload.event.id,
          error: error instanceof Error ? error.message : 'unknown',
        },
        payload.event.id,
      );
    }
  }

  private acquire(key: string): boolean {
    const now = Date.now();
    const existing = this.processed.get(key);
    if (existing && existing > now) {
      return false;
    }
    this.processed.set(key, now + this.ttlMs);
    return true;
  }
}
