import { BadRequestException, Injectable } from '@nestjs/common';
import { SetKpiGoalDto } from '../../dto/admin';
import {
  IAllKpis,
  IEvent,
  IEventFilter,
  IKpiGoal,
  IKpiResult,
} from '../../interfaces';
import { EventKpiRepository, EventRegistrationRepository, EventRepository } from '../../repositories';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class EventKpiService {
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly registrationRepository: EventRegistrationRepository,
    private readonly eventKpiRepository: EventKpiRepository,
  ) {}

  /**
   * Fórmula:
   * - value = total de eventos ativos (SCHEDULED, UPCOMING, IN_PROGRESS) no mês
   * - percentageChange = ((value - previousValue) / previousValue) * 100
   */
  async getActiveEventsKpi(month: number, year: number): Promise<IKpiResult> {
    return this.fromCache(`kpi:active-events:${month}:${year}`, async () => {
      const current = await this.countActiveEvents(month, year);
      const previousRef = this.getPreviousMonth(month, year);
      const previous = await this.countActiveEvents(previousRef.month, previousRef.year);
      const goal = await this.eventKpiRepository.getGoal(
        'ACTIVE_EVENTS',
        month,
        year,
      );
      return this.composeKpiResult(current, previous, goal);
    });
  }

  /**
   * Fórmula:
   * - value = total de inscrições registradas no mês
   * - percentageChange = ((value - previousValue) / previousValue) * 100
   */
  async getRegisteredParticipantsKpi(month: number, year: number): Promise<IKpiResult> {
    return this.fromCache(`kpi:registered-participants:${month}:${year}`, async () => {
      const current = await this.registrationRepository.countByMonth(month, year);
      const previousRef = this.getPreviousMonth(month, year);
      const previous = await this.registrationRepository.countByMonth(
        previousRef.month,
        previousRef.year,
      );
      const goal = await this.eventKpiRepository.getGoal(
        'REGISTERED_PARTICIPANTS',
        month,
        year,
      );
      return this.composeKpiResult(current, previous, goal);
    });
  }

  /**
   * Fórmula:
   * - currentPercentage = (inscritosNoMes / vagasTotaisNoMes) * 100
   * - percentageChange = ((currentPercentage - previousPercentage) / previousPercentage) * 100
   */
  async getRegistrationPercentageKpi(month: number, year: number): Promise<IKpiResult> {
    return this.fromCache(`kpi:registration-percentage:${month}:${year}`, async () => {
      const current = await this.calculateRegistrationPercentage(month, year);
      const previousRef = this.getPreviousMonth(month, year);
      const previous = await this.calculateRegistrationPercentage(
        previousRef.month,
        previousRef.year,
      );
      const goal = await this.eventKpiRepository.getGoal(
        'REGISTRATION_PERCENTAGE',
        month,
        year,
      );
      return this.composeKpiResult(current, previous, goal);
    });
  }

  /**
   * Fórmula:
   * - value = quantidade de eventos com availableSlots = 0 no mês
   * - percentageChange = ((value - previousValue) / previousValue) * 100
   */
  async getSoldOutEventsKpi(month: number, year: number): Promise<IKpiResult> {
    return this.fromCache(`kpi:sold-out-events:${month}:${year}`, async () => {
      const current = (await this.eventRepository.findSoldOutEvents(month, year)).length;
      const previousRef = this.getPreviousMonth(month, year);
      const previous = (
        await this.eventRepository.findSoldOutEvents(previousRef.month, previousRef.year)
      ).length;
      const goal = await this.eventKpiRepository.getGoal(
        'SOLD_OUT_EVENTS',
        month,
        year,
      );
      return this.composeKpiResult(current, previous, goal);
    });
  }

  async setKpiGoal(data: SetKpiGoalDto): Promise<IKpiGoal> {
    if (data.targetValue < 0) {
      throw new BadRequestException('targetValue deve ser maior ou igual a 0.');
    }
    const goal = await this.eventKpiRepository.setGoal({
      kpiType: data.kpiType,
      targetValue: data.targetValue,
      month: data.month,
      year: data.year,
    });
    this.clearMonthCache(data.month, data.year);
    return goal;
  }

  async getAllKpis(month: number, year: number): Promise<IAllKpis> {
    return this.fromCache(`kpi:all:${month}:${year}`, async () => {
      const [activeEvents, registeredParticipants, registrationPercentage, soldOutEvents] =
        await Promise.all([
          this.getActiveEventsKpi(month, year),
          this.getRegisteredParticipantsKpi(month, year),
          this.getRegistrationPercentageKpi(month, year),
          this.getSoldOutEventsKpi(month, year),
        ]);

      return {
        activeEvents,
        registeredParticipants,
        registrationPercentage,
        soldOutEvents,
      };
    });
  }

  invalidateCacheForMonth(month: number, year: number): void {
    this.clearMonthCache(month, year);
  }

  invalidateAllCache(): void {
    this.cache.clear();
  }

  private async countActiveEvents(month: number, year: number): Promise<number> {
    const { from, to } = this.getMonthRange(month, year);
    const filter: IEventFilter = {
      statuses: ['SCHEDULED', 'UPCOMING', 'IN_PROGRESS'],
      fromDate: from,
      toDate: to,
    };
    const events = await this.eventRepository.findByFilters(filter);
    return events.length;
  }

  private async calculateRegistrationPercentage(
    month: number,
    year: number,
  ): Promise<number> {
    const [registeredCount, totalSlots] = await Promise.all([
      this.registrationRepository.countByMonth(month, year),
      this.sumTotalSlotsInMonth(month, year),
    ]);
    if (totalSlots === 0) {
      return 0;
    }
    return Number(((registeredCount / totalSlots) * 100).toFixed(2));
  }

  private async sumTotalSlotsInMonth(month: number, year: number): Promise<number> {
    const { from, to } = this.getMonthRange(month, year);
    const events: IEvent[] = await this.eventRepository.findByFilters({
      fromDate: from,
      toDate: to,
    });
    return events.reduce((acc, event) => acc + event.totalSlots, 0);
  }

  private composeKpiResult(
    value: number,
    previousValue: number,
    goal: IKpiGoal | null,
  ): IKpiResult {
    const percentageChange = this.calculateChangePercentage(value, previousValue);
    const changeType: IKpiResult['changeType'] =
      value > previousValue ? 'increase' : value < previousValue ? 'decrease' : 'stable';

    const goalValue = goal ? goal.targetValue : null;
    const goalPercentage = this.calculateGoalPercentage(value, goalValue);
    const goalStatus: IKpiResult['goalStatus'] = !goalValue
      ? 'not_set'
      : value >= goalValue
        ? 'achieved'
        : 'in_progress';

    return {
      value,
      previousValue,
      percentageChange,
      changeType,
      goal: goalValue,
      goalPercentage,
      goalStatus,
    };
  }

  private calculateChangePercentage(current: number, previous: number): number {
    if (previous === 0) {
      if (current === 0) {
        return 0;
      }
      return 100;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  private calculateGoalPercentage(current: number, goal: number | null): number | null {
    if (goal === null || goal === undefined) {
      return null;
    }
    if (goal === 0) {
      return 100;
    }
    return Number(((current / goal) * 100).toFixed(2));
  }

  private getMonthRange(month: number, year: number): { from: Date; to: Date } {
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    return { from, to };
  }

  private getPreviousMonth(month: number, year: number): { month: number; year: number } {
    if (month === 1) {
      return { month: 12, year: year - 1 };
    }
    return { month: month - 1, year };
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

  private clearMonthCache(month: number, year: number): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${month}:${year}`)) {
        this.cache.delete(key);
      }
    }
  }
}
