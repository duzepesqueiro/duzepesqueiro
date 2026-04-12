import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from '../../../application/logs/services';
import {
  EventCreatedPayload,
  EventRegisteredPayload,
  EventRegistrationCancelledPayload,
  EventSoldOutPayload,
  EventStatusUpdatedPayload,
  EventUpdatedPayload,
} from '../../../shared/events/events/event-payloads';
import { EventEvents } from '../../../shared/events/events/event-types';
import { EventChartService, EventKpiService } from '../services/admin';

@Injectable()
export class EventMetricsListener {
  constructor(
    private readonly eventKpiService: EventKpiService,
    private readonly eventChartService: EventChartService,
    private readonly logsService: LogsService,
  ) {}

  @OnEvent(EventEvents.REGISTERED)
  async updateMetrics(payload: EventRegisteredPayload): Promise<void> {
    await this.invalidateForEvent(payload.event.id, payload.event.eventDate);
  }

  @OnEvent(EventEvents.REGISTRATION_CANCELLED)
  async updateMetricsOnCancellation(
    payload: EventRegistrationCancelledPayload,
  ): Promise<void> {
    await this.invalidateForEvent(payload.event.id, payload.event.eventDate);
  }

  @OnEvent(EventEvents.CREATED)
  async updateMetricsOnCreate(payload: EventCreatedPayload): Promise<void> {
    await this.invalidateForEvent(payload.event.id, payload.event.eventDate);
  }

  @OnEvent(EventEvents.UPDATED)
  async updateMetricsOnUpdate(payload: EventUpdatedPayload): Promise<void> {
    await this.invalidateForEvent(payload.event.id, payload.event.eventDate);
  }

  @OnEvent(EventEvents.STATUS_UPDATED)
  async updateMetricsOnStatus(payload: EventStatusUpdatedPayload): Promise<void> {
    try {
      this.eventKpiService.invalidateAllCache();
      this.eventChartService.invalidateAllCache();
      void this.logsService.info('events', 'EventMetricsCacheInvalidated', {
        eventId: payload.eventId,
        reason: 'status_updated',
      });
    } catch (error) {
      void this.logsService.error('events', 'EventMetricsCacheInvalidationFailed', {
        eventId: payload.eventId,
        reason: 'status_updated',
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  @OnEvent(EventEvents.SOLD_OUT)
  async updateMetricsOnSoldOut(payload: EventSoldOutPayload): Promise<void> {
    await this.invalidateForEvent(payload.event.id, payload.event.eventDate);
  }

  private async invalidateForEvent(eventId: string, eventDate: Date): Promise<void> {
    try {
      this.eventKpiService.invalidateCacheForMonth(
        eventDate.getMonth() + 1,
        eventDate.getFullYear(),
      );
      this.eventChartService.invalidateAllCache();
      void this.logsService.info('events', 'EventMetricsCacheInvalidated', {
        eventId,
        month: eventDate.getMonth() + 1,
        year: eventDate.getFullYear(),
      });
    } catch (error) {
      void this.logsService.error('events', 'EventMetricsCacheInvalidationFailed', {
        eventId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
}
