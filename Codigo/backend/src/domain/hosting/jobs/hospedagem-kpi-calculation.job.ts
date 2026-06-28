import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HospedagemKpiType, ReservationStatus } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { NotificationsService } from '../../../application/notifications/services/notifications.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HospedagemMetricsService } from '../services';
import { runExclusiveJob } from './job-runner';

type ComputedKpis = {
  occupancyRate: number;
  activeReservations: number;
  cancelledReservations: number;
  revenueDay: number;
  revenueMonth: number;
};

@Injectable()
export class HospedagemKPICalculationJob implements OnModuleInit, OnModuleDestroy {
  private midnightTimeout?: NodeJS.Timeout;
  private dailyInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: HospedagemMetricsService,
    private readonly notificationsService: NotificationsService,
    private readonly logsService: LogsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.scheduleDailyMidnightRun();
  }

  onModuleDestroy(): void {
    if (this.midnightTimeout) {
      clearTimeout(this.midnightTimeout);
    }
    if (this.dailyInterval) {
      clearInterval(this.dailyInterval);
    }
  }

  async executar(dataReferencia = this.getPreviousDay(new Date())): Promise<void> {
    const referenceDate = this.startOfDay(dataReferencia);
    const values = await this.calcularKPIsDoDia(referenceDate);
    const anomalies = await this.persistirComVariacoes(referenceDate, values);
    await this.metricsService.limparCacheMetricas();

    if (anomalies.length > 0) {
      this.notificationsService.sendToAdmins('hosting.kpi.anomaly', {
        referenceDate: referenceDate.toISOString(),
        anomalies,
      });
      void this.logsService.warn(
        'hosting',
        'HostingKPIAnomalyDetected',
        {
          referenceDate: referenceDate.toISOString(),
          anomalies,
        },
      );
    }
  }

  private async calcularKPIsDoDia(referenceDate: Date): Promise<ComputedKpis> {
    const dayStart = this.startOfDay(referenceDate);
    const dayEnd = this.endOfDay(referenceDate);
    const monthRange = this.metricsService.obterRangePorGranularidade('mes', referenceDate);

    const [occupancyRate, activeReservations, cancelledReservations, revenueDay, revenueMonth] =
      await Promise.all([
        this.metricsService.obterTaxaOcupacao(referenceDate),
        this.prisma.hostingReservation.count({
          where: {
            deletedAt: null,
            status: {
              in: [
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
                ReservationStatus.OCCUPIED,
              ],
            },
            checkInDate: { lte: dayEnd },
            checkOutDate: { gt: dayStart },
          },
        }),
        this.prisma.hostingReservation.count({
          where: {
            deletedAt: null,
            status: ReservationStatus.CANCELLED,
            cancelledAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        }),
        this.metricsService.obterReceitaTotal({ startDate: dayStart, endDate: dayEnd }),
        this.metricsService.obterReceitaTotal(monthRange),
      ]);

    return {
      occupancyRate,
      activeReservations,
      cancelledReservations,
      revenueDay,
      revenueMonth,
    };
  }

  private async persistirComVariacoes(
    referenceDate: Date,
    values: ComputedKpis,
  ): Promise<
    Array<{
      metric: HospedagemKpiType;
      value: number;
      previousValue: number;
      variationPercent: number;
    }>
  > {
    const metricsToPersist: Array<{ metric: HospedagemKpiType; value: number; metadata?: Record<string, unknown> }> = [
      { metric: HospedagemKpiType.OCCUPANCY_RATE, value: values.occupancyRate },
      { metric: HospedagemKpiType.ACTIVE_RESERVATIONS, value: values.activeReservations },
      { metric: HospedagemKpiType.CANCELLED_RESERVATIONS, value: values.cancelledReservations },
      {
        metric: HospedagemKpiType.TOTAL_REVENUE,
        value: values.revenueDay,
        metadata: { revenueMonth: values.revenueMonth },
      },
    ];

    const previousDate = this.getPreviousDay(referenceDate);
    const previousRows = await this.prisma.hostingKpi.findMany({
      where: {
        referenceDate: previousDate,
        metric: {
          in: metricsToPersist.map((item) => item.metric),
        },
      },
      select: {
        metric: true,
        value: true,
      },
    });
    const previousMap = new Map(previousRows.map((row) => [row.metric, Number(row.value)]));

    const anomalyThreshold = Number(
      this.configService.get<number>('hosting.kpiAnomalyThresholdPercent') ?? 30,
    );
    const anomalies: Array<{
      metric: HospedagemKpiType;
      value: number;
      previousValue: number;
      variationPercent: number;
    }> = [];

    for (const item of metricsToPersist) {
      const previousValue = previousMap.get(item.metric) ?? 0;
      const variationPercent =
        previousValue === 0
          ? item.value === 0
            ? 0
            : 100
          : Number((((item.value - previousValue) / previousValue) * 100).toFixed(2));

      const metadata = {
        previousValue,
        variationPercent,
        anomalyThreshold,
        ...(item.metadata ?? {}),
      };

      await this.prisma.hostingKpi.upsert({
        where: {
          metric_referenceDate: {
            metric: item.metric,
            referenceDate,
          },
        },
        update: {
          value: item.value,
          metadata,
        },
        create: {
          metric: item.metric,
          referenceDate,
          value: item.value,
          metadata,
        },
      });

      if (Math.abs(variationPercent) >= anomalyThreshold) {
        anomalies.push({
          metric: item.metric,
          value: item.value,
          previousValue,
          variationPercent,
        });
      }
    }

    return anomalies;
  }

  private scheduleDailyMidnightRun(): void {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const initialDelay = Math.max(0, nextMidnight.getTime() - now.getTime());

    this.midnightTimeout = setTimeout(async () => {
      await runExclusiveJob(this.prisma, 'hosting.kpi-calculation', async () => {
        await this.executar(this.getPreviousDay(new Date()));
      });
      this.dailyInterval = setInterval(async () => {
        await runExclusiveJob(this.prisma, 'hosting.kpi-calculation', async () => {
          await this.executar(this.getPreviousDay(new Date()));
        });
      }, 24 * 60 * 60 * 1000);
    }, initialDelay);
  }

  private getPreviousDay(date: Date): Date {
    const previous = new Date(date);
    previous.setDate(previous.getDate() - 1);
    return this.startOfDay(previous);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }
}
