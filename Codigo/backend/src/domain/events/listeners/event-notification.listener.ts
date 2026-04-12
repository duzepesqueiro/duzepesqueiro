import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from '../../../application/logs/services';
import { EventsGateway } from '../gateways/events.gateway';
import {
  EventCreatedPayload,
  EventRegisteredPayload,
  EventSoldOutPayload,
  EventUpdatedPayload,
} from '../../../shared/events/events/event-payloads';
import { EventEvents } from '../../../shared/events/events/event-types';

@Injectable()
export class EventNotificationListener {
  private readonly processed = new Map<string, number>();
  private readonly ttlMs = 5 * 60 * 1000;

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly logsService: LogsService,
  ) {}

  @OnEvent(EventEvents.CREATED)
  async handleEventCreated(payload: EventCreatedPayload): Promise<void> {
    const key = `${EventEvents.CREATED}:${payload.event.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      this.eventsGateway.emitToAdmins('event:created', {
        type: 'NEW_EVENT',
        data: payload.event,
      });
      this.eventsGateway.emitToAdmins('dashboard:chart_update', {
        type: 'EVENT_CREATED',
        eventId: payload.event.id,
      });
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventCreatedWsNotifyFailed',
        { eventId: payload.event.id, error: error instanceof Error ? error.message : 'unknown' },
        payload.event.id,
      );
    }
  }

  @OnEvent(EventEvents.REGISTERED)
  async handleNewRegistration(payload: EventRegisteredPayload): Promise<void> {
    const key = `${EventEvents.REGISTERED}:ws:${payload.registration.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      this.eventsGateway.emitToAdmins('event:registration', {
        type: 'NEW_REGISTRATION',
        data: {
          registrationId: payload.registration.id,
          eventId: payload.event.id,
          userId: payload.user.id,
        },
      });
      this.eventsGateway.emitToAdmins('dashboard:kpi_update', {
        type: 'REGISTRATION_CREATED',
        eventId: payload.event.id,
      });
      this.eventsGateway.emitToAdmins('dashboard:chart_update', {
        type: 'REGISTRATION_CREATED',
        eventId: payload.event.id,
      });
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventRegisteredWsNotifyFailed',
        {
          registrationId: payload.registration.id,
          error: error instanceof Error ? error.message : 'unknown',
        },
        payload.event.id,
      );
    }
  }

  @OnEvent(EventEvents.UPDATED)
  async handleEventUpdated(payload: EventUpdatedPayload): Promise<void> {
    const key = `${EventEvents.UPDATED}:ws:${payload.event.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      this.eventsGateway.emitToAdmins('event:updated', {
        type: 'EVENT_UPDATED',
        data: payload.event,
      });
      this.eventsGateway.emitToAdmins('dashboard:chart_update', {
        type: 'EVENT_UPDATED',
        eventId: payload.event.id,
      });
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventUpdatedWsNotifyFailed',
        {
          eventId: payload.event.id,
          error: error instanceof Error ? error.message : 'unknown',
        },
        payload.event.id,
      );
    }
  }

  @OnEvent(EventEvents.SOLD_OUT)
  async handleSoldOut(payload: EventSoldOutPayload): Promise<void> {
    const key = `${EventEvents.SOLD_OUT}:ws:${payload.event.id}`;
    if (!this.acquire(key)) {
      return;
    }
    try {
      this.eventsGateway.emitToAdmins('event:sold_out', {
        type: 'SOLD_OUT',
        data: {
          eventId: payload.event.id,
          title: payload.event.title,
          eventDate: payload.event.eventDate,
          eventTime: payload.event.eventTime,
        },
      });
      this.eventsGateway.emitToAdmins('dashboard:kpi_update', {
        type: 'EVENT_SOLD_OUT',
        eventId: payload.event.id,
      });
    } catch (error) {
      void this.logsService.error(
        'events',
        'EventSoldOutWsNotifyFailed',
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
