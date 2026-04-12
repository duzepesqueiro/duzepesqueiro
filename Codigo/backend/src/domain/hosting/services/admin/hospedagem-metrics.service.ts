import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HospedagemKpiType, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  DashboardReservasStatsDTO,
  DateRangeDTO,
  GraficoBarrasDTO,
  HospedagemKPIsDTO,
  MapaOcupacaoDTO,
  MapaOcupacaoDiaDTO,
  OcupacaoDiariaDTO,
  ReceitaChaleDTO,
} from '../../dto';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

@Injectable()
export class HospedagemMetricsService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async obterKPIsGeral(): Promise<HospedagemKPIsDTO> {
    const hoje = new Date();
    const [totalChales, chalesOcupados, reservasAtivas, reservasCanceladas, receitaTotal] =
      await Promise.all([
        this.prisma.hostingChalet.count({
          where: {
            deletedAt: null,
            isActive: true,
          },
        }),
        this.prisma.hostingReservation.groupBy({
          by: ['chaletId'],
          where: {
            deletedAt: null,
            status: ReservationStatus.OCCUPIED,
            checkInDate: { lte: hoje },
            checkOutDate: { gt: hoje },
          },
        }),
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
          },
        }),
        this.prisma.hostingReservation.count({
          where: {
            deletedAt: null,
            status: ReservationStatus.CANCELLED,
          },
        }),
        this.obterReceitaTotal(this.obterRangePorGranularidade('mes', hoje)),
      ]);

    const taxaOcupacao =
      totalChales > 0
        ? Number(((chalesOcupados.length / totalChales) * 100).toFixed(2))
        : 0;

    return {
      totalChales,
      chalesOcupados: chalesOcupados.length,
      taxaOcupacao,
      reservasAtivas,
      reservasCanceladas,
      receitaTotal,
    };
  }

  async obterTaxaOcupacao(data = new Date()): Promise<number> {
    const totalChales = await this.prisma.hostingChalet.count({
      where: {
        deletedAt: null,
        isActive: true,
      },
    });

    if (totalChales === 0) {
      return 0;
    }

    const occupied = await this.prisma.hostingReservation.groupBy({
      by: ['chaletId'],
      where: {
        deletedAt: null,
        status: ReservationStatus.OCCUPIED,
        checkInDate: { lte: data },
        checkOutDate: { gt: data },
      },
    });

    return Number(((occupied.length / totalChales) * 100).toFixed(2));
  }

  async obterReceitaTotal(periodo: DateRangeDTO): Promise<number> {
    const total = await this.prisma.hostingReservation.aggregate({
      _sum: { totalAmount: true },
      where: {
        deletedAt: null,
        status: ReservationStatus.COMPLETED,
        OR: [
          {
            checkedOutAt: {
              gte: periodo.startDate,
              lte: periodo.endDate,
            },
          },
          {
            checkOutDate: {
              gte: periodo.startDate,
              lte: periodo.endDate,
            },
          },
        ],
      },
    });

    return Number(total._sum.totalAmount ?? 0);
  }

  async obterReceitaPorChale(periodo: DateRangeDTO): Promise<ReceitaChaleDTO[]> {
    const key = this.buildCacheKey('receita-por-chale', periodo);
    return this.withCache(key, async () => {
      const grouped = await this.prisma.hostingReservation.groupBy({
        by: ['chaletId'],
        where: {
          deletedAt: null,
          status: ReservationStatus.COMPLETED,
          OR: [
            {
              checkedOutAt: {
                gte: periodo.startDate,
                lte: periodo.endDate,
              },
            },
            {
              checkOutDate: {
                gte: periodo.startDate,
                lte: periodo.endDate,
              },
            },
          ],
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      });

      const chaletIds = grouped.map((item) => item.chaletId);
      const chalets = await this.prisma.hostingChalet.findMany({
        where: { id: { in: chaletIds } },
        select: {
          id: true,
          name: true,
          unitType: true,
        },
      });

      const chaletById = new Map(chalets.map((item) => [item.id, item]));
      const result: ReceitaChaleDTO[] = [];
      for (const item of grouped) {
        const chalet = chaletById.get(item.chaletId);
        if (!chalet) {
          continue;
        }
        result.push({
          chaletId: item.chaletId,
          chaletNome: chalet.name,
          chaletTipo: chalet.unitType,
          receitaTotal: Number(item._sum.totalAmount ?? 0),
          totalReservas: item._count.id,
        });
      }
      return result.sort((a, b) => b.receitaTotal - a.receitaTotal);
    });
  }

  async obterContagemReservasPorStatus(): Promise<Record<ReservationStatus, number>> {
    const grouped = await this.prisma.hostingReservation.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: { id: true },
    });

    const result = {
      [ReservationStatus.PENDING]: 0,
      [ReservationStatus.CONFIRMED]: 0,
      [ReservationStatus.OCCUPIED]: 0,
      [ReservationStatus.COMPLETED]: 0,
      [ReservationStatus.CANCELLED]: 0,
      [ReservationStatus.NO_SHOW]: 0,
    } as Record<ReservationStatus, number>;

    for (const item of grouped) {
      result[item.status] = item._count.id;
    }

    return result;
  }

  async obterOcupacaoDiaria(data: Date): Promise<OcupacaoDiariaDTO[]> {
    const dayStart = this.startOfDay(data);
    const dayEnd = this.addDays(dayStart, 1);

    const [chalets, reservations, blocks] = await Promise.all([
      this.prisma.hostingChalet.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.hostingReservation.findMany({
        where: {
          deletedAt: null,
          checkInDate: { lt: dayEnd },
          checkOutDate: { gt: dayStart },
          status: {
            in: [
              ReservationStatus.PENDING,
              ReservationStatus.CONFIRMED,
              ReservationStatus.OCCUPIED,
              ReservationStatus.COMPLETED,
            ],
          },
        },
        select: {
          chaletId: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
        },
      }),
      this.prisma.hostingChaletBlock.findMany({
        where: {
          isActive: true,
          startDate: { lt: dayEnd },
          endDate: { gte: dayStart },
        },
        select: {
          chaletId: true,
          startDate: true,
          endDate: true,
        },
      }),
    ]);

    return chalets.map((chalet) => ({
      chaletId: chalet.id,
      chaletNome: chalet.name,
      status: this.resolveStatusForDate(chalet.id, dayStart, reservations, blocks),
      dataReferencia: dayStart,
    }));
  }

  async obterMapaOcupacao(chaleId: string, mes: number, ano: number): Promise<MapaOcupacaoDTO> {
    const key = `mapa-ocupacao:${chaleId}:${ano}-${mes}`;
    return this.withCache(key, async () => {
      const chale = await this.prisma.hostingChalet.findFirst({
        where: {
          id: chaleId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });
      if (!chale) {
        throw new NotFoundException('Chalé não encontrado para mapa de ocupação.');
      }

      const monthStart = new Date(ano, mes - 1, 1);
      const monthEnd = new Date(ano, mes, 1);
      const daysInMonth = new Date(ano, mes, 0).getDate();

      const [reservations, blocks] = await Promise.all([
        this.prisma.hostingReservation.findMany({
          where: {
            chaletId: chaleId,
            deletedAt: null,
            checkInDate: { lt: monthEnd },
            checkOutDate: { gt: monthStart },
            status: {
              in: [
                ReservationStatus.PENDING,
                ReservationStatus.CONFIRMED,
                ReservationStatus.OCCUPIED,
                ReservationStatus.COMPLETED,
              ],
            },
          },
          select: {
            chaletId: true,
            status: true,
            checkInDate: true,
            checkOutDate: true,
          },
        }),
        this.prisma.hostingChaletBlock.findMany({
          where: {
            chaletId: chaleId,
            isActive: true,
            startDate: { lt: monthEnd },
            endDate: { gte: monthStart },
          },
          select: {
            chaletId: true,
            startDate: true,
            endDate: true,
          },
        }),
      ]);

      const dias: MapaOcupacaoDiaDTO[] = [];
      for (let dia = 1; dia <= daysInMonth; dia++) {
        const day = new Date(ano, mes - 1, dia);
        dias.push({
          data: day,
          status: this.resolveStatusForDate(chaleId, day, reservations, blocks),
        });
      }

      return {
        chaletId: chale.id,
        chaletNome: chale.name,
        mes,
        ano,
        dias,
      };
    });
  }

  async gerarDadosGraficoBarras(periodo: DateRangeDTO): Promise<GraficoBarrasDTO> {
    const key = this.buildCacheKey('grafico-barras', periodo);
    return this.withCache(key, async () => {
      const receitaPorChale = await this.obterReceitaPorChale(periodo);
      return {
        labels: receitaPorChale.map((item) => item.chaletNome),
        receitas: receitaPorChale.map((item) => item.receitaTotal),
        reservas: receitaPorChale.map((item) => item.totalReservas),
      };
    });
  }

  async obterEstatisticasReservas(data?: Date): Promise<DashboardReservasStatsDTO> {
    const [status, taxaOcupacao] = await Promise.all([
      this.obterContagemReservasPorStatus(),
      this.obterTaxaOcupacao(data),
    ]);
    return { status, taxaOcupacao };
  }

  async atualizarSnapshotKPIs(referenceDate = new Date()): Promise<void> {
    const normalizedDate = this.startOfDay(referenceDate);
    const kpis = await this.obterKPIsGeral();
    await this.prisma.$transaction(async (tx) => {
      await tx.hostingKpi.deleteMany({
        where: {
          referenceDate: normalizedDate,
        },
      });

      await tx.hostingKpi.createMany({
        data: [
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.OCCUPANCY_RATE,
            value: kpis.taxaOcupacao,
          },
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.TOTAL_REVENUE,
            value: kpis.receitaTotal,
          },
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.ACTIVE_RESERVATIONS,
            value: kpis.reservasAtivas,
          },
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.CANCELLED_RESERVATIONS,
            value: kpis.reservasCanceladas,
          },
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.AVAILABLE_CHALES,
            value: Math.max(0, kpis.totalChales - kpis.chalesOcupados),
          },
          {
            referenceDate: normalizedDate,
            metric: HospedagemKpiType.OCCUPIED_CHALES,
            value: kpis.chalesOcupados,
          },
        ],
      });
    });
  }

  obterRangePorGranularidade(
    periodo: 'semana' | 'mes' | 'ano',
    dataReferencia = new Date(),
  ): DateRangeDTO {
    const ref = this.startOfDay(dataReferencia);

    if (periodo === 'ano') {
      return {
        startDate: new Date(ref.getFullYear(), 0, 1),
        endDate: new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    }

    if (periodo === 'semana') {
      const day = ref.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = this.addDays(ref, mondayOffset);
      const end = this.addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
      };
    }

    return {
      startDate: new Date(ref.getFullYear(), ref.getMonth(), 1),
      endDate: new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }

  async limparCacheMetricas(): Promise<void> {
    this.cache.clear();
  }

  private async withCache<T>(key: string, load: () => Promise<T>): Promise<T> {
    const ttlMs = Number(this.configService.get<number>('hosting.metricsCacheTtlMs') ?? 5 * 60 * 1000);
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const value = await load();
    this.cache.set(key, {
      value,
      expiresAt: now + ttlMs,
    });
    return value;
  }

  private buildCacheKey(prefix: string, range: DateRangeDTO): string {
    return `${prefix}:${range.startDate.toISOString()}:${range.endDate.toISOString()}`;
  }

  private resolveStatusForDate(
    chaletId: string,
    day: Date,
    reservations: Array<{
      chaletId: string;
      status: ReservationStatus;
      checkInDate: Date;
      checkOutDate: Date;
    }>,
    blocks: Array<{
      chaletId: string;
      startDate: Date;
      endDate: Date;
    }>,
  ): 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'BLOCKED' {
    const dayStart = this.startOfDay(day);
    const dayEnd = this.addDays(dayStart, 1);

    const hasBlock = blocks.some(
      (item) =>
        item.chaletId === chaletId &&
        item.startDate < dayEnd &&
        item.endDate >= dayStart,
    );
    if (hasBlock) {
      return 'BLOCKED';
    }

    const hasOccupied = reservations.some(
      (item) =>
        item.chaletId === chaletId &&
        item.checkInDate < dayEnd &&
        item.checkOutDate > dayStart &&
        (item.status === ReservationStatus.OCCUPIED ||
          item.status === ReservationStatus.COMPLETED),
    );
    if (hasOccupied) {
      return 'OCCUPIED';
    }

    const hasReserved = reservations.some(
      (item) =>
        item.chaletId === chaletId &&
        item.checkInDate < dayEnd &&
        item.checkOutDate > dayStart &&
        (item.status === ReservationStatus.PENDING ||
          item.status === ReservationStatus.CONFIRMED),
    );
    if (hasReserved) {
      return 'RESERVED';
    }

    return 'AVAILABLE';
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
