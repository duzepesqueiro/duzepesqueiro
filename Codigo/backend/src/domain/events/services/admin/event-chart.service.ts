import { BadRequestException, Injectable } from '@nestjs/common';
import {
  IMonthlyChartData,
  IStatusDistribution,
  ITopEvent,
  ITrendData,
  IYearlyChartData,
} from '../../interfaces';
import { EventRegistrationRepository, EventRepository } from '../../repositories';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class EventChartService {
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly monthLabels = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly registrationRepository: EventRegistrationRepository,
  ) {}

  async getMonthlyChartData(year: number): Promise<IMonthlyChartData> {
    return this.fromCache(`chart:monthly:${year}`, async () => {
      const months = Array.from({ length: 12 }, (_, index) => index + 1);
      const [participants, events] = await Promise.all([
        Promise.all(
          months.map((month) => this.registrationRepository.countByMonth(month, year)),
        ),
        Promise.all(months.map((month) => this.eventRepository.countByMonth(month, year))),
      ]);

      return {
        months: [...this.monthLabels],
        participants,
        events,
        totalParticipants: participants.reduce((acc, value) => acc + value, 0),
        totalEvents: events.reduce((acc, value) => acc + value, 0),
      };
    });
  }

  async getYearlyChartData(
    startYear: number,
    endYear: number,
  ): Promise<IYearlyChartData> {
    if (endYear < startYear) {
      throw new BadRequestException('endYear deve ser maior ou igual a startYear.');
    }

    return this.fromCache(`chart:yearly:${startYear}:${endYear}`, async () => {
      const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, index) => startYear + index,
      );

      const rows = await Promise.all(
        years.map(async (year) => {
          const monthly = await this.getMonthlyChartData(year);
          return {
            year,
            participants: monthly.totalParticipants,
            events: monthly.totalEvents,
          };
        }),
      );

      const participants = rows.map((row) => row.participants);
      const events = rows.map((row) => row.events);

      return {
        years,
        participants,
        events,
        totalParticipants: participants.reduce((acc, value) => acc + value, 0),
        totalEvents: events.reduce((acc, value) => acc + value, 0),
      };
    });
  }

  async getEventStatusDistribution(
    month?: number,
    year?: number,
  ): Promise<IStatusDistribution> {
    const cacheKey = `chart:status:${month ?? 'all'}:${year ?? 'all'}`;
    return this.fromCache(cacheKey, async () => {
      const periodFilter =
        month && year
          ? {
              fromDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
              toDate: new Date(year, month, 0, 23, 59, 59, 999),
            }
          : {};

      const events = await this.eventRepository.findByFilters(periodFilter);
      return {
        scheduled: events.filter((event) => event.status === 'SCHEDULED').length,
        inProgress: events.filter((event) => event.status === 'IN_PROGRESS').length,
        completed: events.filter((event) => event.status === 'COMPLETED').length,
        cancelled: events.filter((event) => event.status === 'CANCELLED').length,
        upcoming: events.filter((event) => event.status === 'UPCOMING').length,
      };
    });
  }

  async getParticipantsTrend(months: number = 6): Promise<ITrendData> {
    if (months <= 0) {
      throw new BadRequestException('months deve ser maior que 0.');
    }

    return this.fromCache(`chart:trend:${months}`, async () => {
      const now = new Date();
      const refs = Array.from({ length: months }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
        return { month: date.getMonth() + 1, year: date.getFullYear() };
      });

      const values = await Promise.all(
        refs.map((ref) => this.registrationRepository.countByMonth(ref.month, ref.year)),
      );

      const labels = refs.map((ref) => `${this.monthLabels[ref.month - 1]}/${ref.year}`);
      const movingAverage = values.map((_, index) => {
        const window = values.slice(Math.max(0, index - 2), index + 1);
        return Number(
          (window.reduce((acc, value) => acc + value, 0) / window.length).toFixed(2),
        );
      });

      const trend = this.detectTrend(values);
      return {
        labels,
        values,
        movingAverage,
        trend,
      };
    });
  }

  async getTopEvents(
    limit: number = 5,
    month?: number,
    year?: number,
  ): Promise<ITopEvent[]> {
    const cacheKey = `chart:top-events:${limit}:${month ?? 'all'}:${year ?? 'all'}`;
    return this.fromCache(cacheKey, async () => {
      const periodFilter =
        month && year
          ? {
              fromDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
              toDate: new Date(year, month, 0, 23, 59, 59, 999),
            }
          : {};

      const events = await this.eventRepository.findByFilters(periodFilter);
      const eventsWithParticipants = await Promise.all(
        events.map(async (event) => {
          const participants = await this.registrationRepository.countByEventId(event.id);
          const occupancyPercentage =
            event.totalSlots > 0
              ? Number(((participants / event.totalSlots) * 100).toFixed(2))
              : 0;
          return {
            eventId: event.id,
            title: event.title,
            participants,
            totalSlots: event.totalSlots,
            availableSlots: event.availableSlots,
            occupancyPercentage,
          };
        }),
      );

      return eventsWithParticipants
        .sort((a, b) => b.participants - a.participants)
        .slice(0, limit);
    });
  }

  invalidateAllCache(): void {
    this.cache.clear();
  }

  private detectTrend(values: number[]): 'upward' | 'downward' | 'stable' {
    if (values.length < 2) {
      return 'stable';
    }
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first) {
      return 'upward';
    }
    if (last < first) {
      return 'downward';
    }
    return 'stable';
  }

  private async fromCache<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const value = await factory();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    return value;
  }
}
