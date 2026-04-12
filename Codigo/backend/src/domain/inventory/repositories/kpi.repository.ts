import { Injectable } from '@nestjs/common';
import { Prisma, StockKpiAggregate, StockKpiType } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class KpiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: {
    referenceDate: Date;
    kpiType: StockKpiType;
    value: number;
    percentageVariation?: number | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<StockKpiAggregate> {
    return this.prisma.stockKpiAggregate.upsert({
      where: {
        kpiType_referenceDate: {
          kpiType: data.kpiType,
          referenceDate: data.referenceDate,
        },
      },
      create: {
        referenceDate: data.referenceDate,
        kpiType: data.kpiType,
        value: new Prisma.Decimal(data.value),
        percentageVariation:
          data.percentageVariation !== undefined && data.percentageVariation !== null
            ? new Prisma.Decimal(data.percentageVariation)
            : null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      update: {
        value: new Prisma.Decimal(data.value),
        percentageVariation:
          data.percentageVariation !== undefined && data.percentageVariation !== null
            ? new Prisma.Decimal(data.percentageVariation)
            : null,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  async findByTypeAndDateRange(
    kpiType: StockKpiType,
    startDate: Date,
    endDate: Date,
  ): Promise<StockKpiAggregate[]> {
    return this.prisma.stockKpiAggregate.findMany({
      where: {
        kpiType,
        referenceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { referenceDate: 'asc' },
    });
  }

  async findLatestByType(kpiType: StockKpiType): Promise<StockKpiAggregate | null> {
    return this.prisma.stockKpiAggregate.findFirst({
      where: { kpiType },
      orderBy: { referenceDate: 'desc' },
    });
  }

  async getLastUpdate(): Promise<Date | null> {
    const row = await this.prisma.stockKpiAggregate.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  }
}
