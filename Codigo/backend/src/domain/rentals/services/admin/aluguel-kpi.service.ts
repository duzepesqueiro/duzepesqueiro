import { Injectable } from '@nestjs/common';
import { PaymentStatus, ProductStatus, RentalStatus } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { DateRange } from '../../interfaces';
import { AluguelRepository } from '../../repositories';

export interface RentalMetrics {
  period: DateRange;
  totalRentals: number;
  activeRentals: number;
  returnedRentals: number;
  overdueRentals: number;
  cancelledRentals: number;
  totalRevenue: number;
}

export interface RevenueData {
  period: DateRange;
  totalRevenue: number;
  averageTicket: number;
  paidRentals: number;
}

export interface UtilizationData {
  equipmentId?: string;
  totalBookedItems: number;
  totalAvailableItems: number;
  utilizationRate: number;
}

export interface PopularItem {
  productId: string;
  productName: string;
  totalBookings: number;
  totalQuantity: number;
  revenue: number;
}

export interface CancellationData {
  totalRentals: number;
  cancelledRentals: number;
  cancellationRate: number;
}

export interface PeriodComparisonData {
  current: RentalMetrics;
  previous: RentalMetrics;
  variation: {
    rentals: number;
    revenue: number;
    cancellationRate: number;
  };
}

@Injectable()
export class AluguelKpiService {
  constructor(
    private readonly aluguelRepository: AluguelRepository,
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async getResumo() {
    const alugueis = await this.getRentalMetrics({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    });
    return {
      total: alugueis.totalRentals,
      ativos: alugueis.activeRentals,
      devolvidos: alugueis.returnedRentals,
    };
  }

  async getRentalMetrics(period: DateRange): Promise<RentalMetrics> {
    const [totalRentals, activeRentals, returnedRentals, overdueRentals, cancelledRentals] =
      await Promise.all([
        this.aluguelRepository.countByPeriod(period.startDate, period.endDate),
        this.aluguelRepository.countByStatus(RentalStatus.ACTIVE),
        this.aluguelRepository.countByStatus(RentalStatus.RETURNED),
        this.aluguelRepository.countByStatus(RentalStatus.OVERDUE),
        this.aluguelRepository.countByStatus(RentalStatus.CANCELLED),
      ]);
    const revenue = await this.getRevenueByPeriod(period.startDate, period.endDate);
    const response: RentalMetrics = {
      period,
      totalRentals,
      activeRentals,
      returnedRentals,
      overdueRentals,
      cancelledRentals,
      totalRevenue: revenue.totalRevenue,
    };
    void this.logsService.info(
      'rental',
      'RentalMetricsGenerated',
      { period, totalRentals },
    );
    return response;
  }

  async getRevenueByPeriod(startDate: Date, endDate: Date): Promise<RevenueData> {
    const prisma = this.prisma as any;
    const result = await prisma.rental.aggregate({
      where: {
        deletedAt: null,
        rentalDate: {
          gte: startDate,
          lte: endDate,
        },
        paymentStatus: {
          in: [PaymentStatus.APPROVED, PaymentStatus.AUTHORIZED],
        },
      },
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
      _count: { id: true },
    });
    return {
      period: { startDate, endDate },
      totalRevenue: Number(result._sum.totalAmount ?? 0),
      averageTicket: Number(result._avg.totalAmount ?? 0),
      paidRentals: result._count.id,
    };
  }

  async getUtilizationRate(equipmentId?: string): Promise<UtilizationData> {
    const prisma = this.prisma as any;
    const [totalBookedItems, totalAvailableItems] = await Promise.all([
      prisma.rentalItem.count({
        where: {
          deletedAt: null,
          ...(equipmentId ? { productId: equipmentId } : {}),
          status: {
            in: [RentalStatus.PENDING, RentalStatus.ACTIVE, RentalStatus.OVERDUE],
          },
          rental: { deletedAt: null },
        },
      }),
      prisma.product.count({
        where: {
          deletedAt: null,
          status: ProductStatus.RENTAL,
          ...(equipmentId ? { id: equipmentId } : {}),
        },
      }),
    ]);
    const utilizationRate =
      totalAvailableItems > 0
        ? Number(((totalBookedItems / totalAvailableItems) * 100).toFixed(2))
        : 0;
    return {
      equipmentId,
      totalBookedItems,
      totalAvailableItems,
      utilizationRate,
    };
  }

  async getMostRentedItems(limit: number): Promise<PopularItem[]> {
    const prisma = this.prisma as any;
    const items = await prisma.rentalItem.groupBy({
      by: ['productId'],
      where: {
        deletedAt: null,
        rental: { deletedAt: null },
      },
      _count: { productId: true },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((item: any) => item.productId) } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((product: any) => [product.id, product.name]));
    return items.map((item: any) => ({
      productId: item.productId,
      productName: productMap.get(item.productId) ?? 'Produto removido',
      totalBookings: item._count.productId,
      totalQuantity: Number(item._sum.quantity ?? 0),
      revenue: Number(item._sum.subtotal ?? 0),
    }));
  }

  async getCancellationRate(): Promise<CancellationData> {
    const prisma = this.prisma as any;
    const [totalRentals, cancelledRentals] = await Promise.all([
      prisma.rentalItem.count({
        where: { deletedAt: null, rental: { deletedAt: null } },
      }),
      prisma.rentalItem.count({
        where: {
          deletedAt: null,
          status: RentalStatus.CANCELLED,
          rental: { deletedAt: null },
        },
      }),
    ]);
    const cancellationRate =
      totalRentals > 0
        ? Number(((cancelledRentals / totalRentals) * 100).toFixed(2))
        : 0;
    return {
      totalRentals,
      cancelledRentals,
      cancellationRate,
    };
  }

  async getComparison(
    current: DateRange,
    previous: DateRange,
  ): Promise<PeriodComparisonData> {
    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getRentalMetrics(current),
      this.getRentalMetrics(previous),
    ]);
    const [currentCancellation, previousCancellation] = await Promise.all([
      this.getCancellationRate(),
      this.getCancellationRate(),
    ]);
    const variation = {
      rentals: currentMetrics.totalRentals - previousMetrics.totalRentals,
      revenue: Number((currentMetrics.totalRevenue - previousMetrics.totalRevenue).toFixed(2)),
      cancellationRate: Number(
        (currentCancellation.cancellationRate - previousCancellation.cancellationRate).toFixed(2),
      ),
    };
    return {
      current: currentMetrics,
      previous: previousMetrics,
      variation,
    };
  }
}

export { AluguelKpiService as RentalKpiService };
