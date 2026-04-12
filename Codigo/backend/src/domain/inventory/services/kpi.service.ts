import { BadRequestException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StockKpiType } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  AgedStockKpiDto,
  InventoryDashboardDto,
  LowStockKpiDto,
  StockTurnoverKpiDto,
  StockoutKpiDto,
  TotalStockValueKpiDto,
} from '../dto';
import { InventoryEventName } from '../events';
import { KpiRepository, ProductRepository } from '../repositories';

@Injectable()
export class KpiService {
  constructor(
    private readonly kpiRepository: KpiRepository,
    private readonly productRepository: ProductRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  async calculateAll(): Promise<InventoryDashboardDto> {
    const totalStockValue = await this.calculateTotalStockValue();
    const stockTurnover = await this.calculateStockTurnover();
    const stockoutFrequency = await this.calculateStockoutFrequency();
    const lowStock = await this.calculateLowStock();
    const agedStock = await this.calculateAgedStock();

    this.eventEmitter.emit('inventory.kpi.calculated', {
      calculatedAt: new Date(),
      kpis: [
        'TOTAL_STOCK_VALUE',
        'STOCK_TURNOVER',
        'STOCKOUT_FREQUENCY',
        'LOW_STOCK',
        'AGED_STOCK',
      ],
    });

    await this.logsService.info(
      'inventory',
      'InventoryKpisRecalculated',
      {
        action: 'UPDATE',
        entity: 'InventoryKpi',
        entityId: 'inventory-dashboard',
        author: {
          userId: 'system',
          name: 'System Scheduler',
          email: 'system@duzepesqueiro.local',
        },
        changes: {
          recalculatedAt: { old: null, new: new Date().toISOString() },
        },
        description: 'Inventory KPIs recalculated',
      },
      'inventory-dashboard',
      {
        source: 'inventory.kpi.service',
        userId: 'system',
      },
    );

    return {
      totalStockValue,
      stockTurnover,
      stockout: stockoutFrequency,
      lowStock,
      agedStock,
      lastUpdatedAt: new Date(),
    };
  }

  async calculateTotalStockValue(): Promise<TotalStockValueKpiDto> {
    const totalValue = await this.productRepository.calculateTotalStockValue();
    const latest = await this.kpiRepository.findLatestByType('TOTAL_STOCK_VALUE');
    const previousMonthValue = latest ? Number(latest.value) : 0;
    const variation =
      previousMonthValue > 0
        ? ((totalValue - previousMonthValue) / previousMonthValue) * 100
        : 0;

    await this.saveKpi('TOTAL_STOCK_VALUE', totalValue, variation, {
      previousMonthValue,
    });

    return {
      totalValue,
      percentageVariation: Number(variation.toFixed(2)),
      previousMonthValue,
    };
  }

  async calculateStockTurnover(): Promise<StockTurnoverKpiDto> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const outboundMovements = await this.getOutboundMovements(oneYearAgo, new Date());
    const products = await this.getActiveProductsSnapshot();

    const annualCogs = outboundMovements.reduce(
      (acc, movement) => acc + movement.quantity * movement.averageCost,
      0,
    );

    const annualAverageStock =
      products.length > 0
        ? products.reduce((acc, product) => acc + product.stockQuantity, 0) /
          products.length
        : 0;

    const annualTurnover =
      annualAverageStock > 0 ? annualCogs / annualAverageStock : 0;

    await this.saveKpi('STOCK_TURNOVER', annualTurnover, 0, {
      annualCogs,
      annualAverageStock,
    });

    return {
      annualTurnover: Number(annualTurnover.toFixed(4)),
      annualAverageStock: Number(annualAverageStock.toFixed(4)),
      annualCogs: Number(annualCogs.toFixed(4)),
    };
  }

  async calculateStockoutFrequency(): Promise<StockoutKpiDto> {
    const products = await this.getActiveProductsSnapshot();
    const totalItems = products.length;
    const stockoutItems = products.filter((item) => item.stockQuantity === 0).length;
    const stockoutPercentage =
      totalItems > 0 ? (stockoutItems / totalItems) * 100 : 0;

    await this.saveKpi('STOCKOUT_FREQUENCY', stockoutPercentage, 0, {
      totalItems,
      stockoutItems,
    });

    return {
      stockoutPercentage: Number(stockoutPercentage.toFixed(2)),
      totalItems,
      stockoutItems,
    };
  }

  async calculateLowStock(): Promise<LowStockKpiDto> {
    const lowStockProducts = await this.productRepository.findLowStockProducts();

    await this.saveKpi('LOW_STOCK', lowStockProducts.length, 0, {
      ids: lowStockProducts.map((item) => item.id),
    });

    return {
      totalLowStockItems: lowStockProducts.length,
      items: lowStockProducts.map((item) => ({
        productId: item.id,
        sku: item.sku,
        name: item.name,
        stockQuantity: Number(item.stockQuantity),
        minimumLimit: Number(item.minimumLimit),
      })),
    };
  }

  async calculateAgedStock(): Promise<AgedStockKpiDto> {
    const daysWithoutMovement = 90;
    const agedProducts = await this.productRepository.findAgedProducts(daysWithoutMovement);
    const agedStockValue = agedProducts.reduce(
      (acc, product) =>
        acc + Number(product.stockQuantity) * Number(product.costPrice),
      0,
    );

    await this.saveKpi('AGED_STOCK', agedStockValue, 0, {
      daysWithoutMovement,
      totalItems: agedProducts.length,
    });

    return {
      agedStockValue: Number(agedStockValue.toFixed(2)),
      daysWithoutMovement,
    };
  }

  async getDashboard(): Promise<InventoryDashboardDto> {
    const [
      totalStockValue,
      stockTurnover,
      stockoutFrequency,
      lowStock,
      agedStock,
      lastUpdate,
    ] = await Promise.all([
      this.calculateTotalStockValue(),
      this.calculateStockTurnover(),
      this.calculateStockoutFrequency(),
      this.calculateLowStock(),
      this.calculateAgedStock(),
      this.kpiRepository.getLastUpdate(),
    ]);

    const dashboard = {
      totalStockValue,
      stockTurnover,
      stockout: stockoutFrequency,
      lowStock,
      agedStock,
      lastUpdatedAt: lastUpdate ?? new Date(),
    };
    this.eventEmitter.emit(InventoryEventName.DASHBOARD_UPDATED, {
      data: {
        totalStockValue: dashboard.totalStockValue.totalValue,
        stockTurnover: dashboard.stockTurnover.annualTurnover,
        stockoutPercentage: dashboard.stockout.stockoutPercentage,
        totalLowStockItems: dashboard.lowStock.totalLowStockItems,
        agedStockValue: dashboard.agedStock.agedStockValue,
      },
      timestamp: new Date(),
    });
    return dashboard;
  }

  async saveKpi(
    type: StockKpiType,
    value: number,
    variation: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const referenceDate = new Date();
    referenceDate.setHours(0, 0, 0, 0);
    await this.kpiRepository.save({
      referenceDate,
      kpiType: type,
      value,
      percentageVariation: variation,
      metadata: metadata ?? null,
    });
    this.eventEmitter.emit(InventoryEventName.KPI_UPDATED, {
      kpiType: type,
      value,
      percentageVariation: variation,
      timestamp: new Date(),
    });
  }

  async getKpiHistory(
    type: StockKpiType,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ referenceDate: Date; value: number; variation: number | null }>> {
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    const rows = await this.kpiRepository.findByTypeAndDateRange(
      type,
      startDate,
      endDate,
    );

    return rows.map((row) => ({
      referenceDate: row.referenceDate,
      value: Number(row.value),
      variation:
        row.percentageVariation !== null ? Number(row.percentageVariation) : null,
    }));
  }

  private async getOutboundMovements(startDate: Date, endDate: Date): Promise<
    Array<{ quantity: number; averageCost: number }>
  > {
    const movements = await this.prisma.inventoryMovement.findMany({
      where: {
        movementType: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        product: {
          select: {
            costPrice: true,
          },
        },
      },
    });

    return movements.map((movement: any) => ({
      quantity: Number(movement.quantity),
      averageCost: Number(movement.product?.costPrice ?? 0),
    }));
  }

  private async getActiveProductsSnapshot(): Promise<
    Array<{ stockQuantity: number }>
  > {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: { stockQuantity: true },
    });
    return products.map((product: any) => ({
      stockQuantity: Number(product.stockQuantity),
    }));
  }
}
