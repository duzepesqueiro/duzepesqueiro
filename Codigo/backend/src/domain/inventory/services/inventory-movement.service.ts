import { Injectable } from '@nestjs/common';
import {
  CreateInventoryMovementDto,
  KardexFilterDto,
  KardexResponseDto,
  MovementHistoryDto,
} from '../dto';
import { InventoryMovementRepository } from '../repositories';

type CurrentUser = {
  id: string;
  email?: string;
  role?: string;
};

type InventoryMovementReport = {
  generatedAt: Date;
  period: {
    startDate?: string;
    endDate?: string;
  };
  summary: {
    totalRecords: number;
    totalInboundQuantity: number;
    totalOutboundQuantity: number;
    netQuantity: number;
  };
  items: MovementHistoryDto[];
};

@Injectable()
export class InventoryMovementService {
  constructor(private readonly movementRepository: InventoryMovementRepository) {}

  async create(
    dto: CreateInventoryMovementDto,
    user: CurrentUser,
  ): Promise<MovementHistoryDto> {
    const movement = await this.movementRepository.create(dto, user.id);
    return {
      id: movement.id,
      movementType: movement.movementType as any,
      movementReason: movement.movementReason as any,
      quantity: Number(movement.quantity),
      previousBalance: Number(movement.previousBalance),
      nextBalance: Number(movement.nextBalance),
      userId: movement.userId,
      referenceId: movement.referenceId ?? undefined,
      referenceType: movement.referenceType ?? undefined,
      note: movement.note ?? undefined,
      createdAt: movement.createdAt,
    };
  }

  async kardexHistory(
    productId: string,
    filters: KardexFilterDto,
  ): Promise<KardexResponseDto> {
    const result = await this.movementRepository.findByProduct(productId, filters);
    const currentBalance = await this.calculateCurrentBalance(productId);
    return {
      items: result.items.map((item) => this.toHistory(item)),
      total: result.total,
      page: result.page,
      itemsPerPage: result.limit,
      currentBalance,
    };
  }

  async findByDateRange(filters: KardexFilterDto): Promise<KardexResponseDto> {
    const result = await this.movementRepository.findAll(filters);
    const currentBalance = filters.productId
      ? await this.calculateCurrentBalance(filters.productId)
      : 0;
    return {
      items: result.items.map((item) => this.toHistory(item)),
      total: result.total,
      page: result.page,
      itemsPerPage: result.limit,
      currentBalance,
    };
  }

  async calculateCurrentBalance(productId: string): Promise<number> {
    const latest = await this.movementRepository.findLatestMovement(productId);
    if (!latest) {
      return this.movementRepository.calculatePreviousBalance(productId);
    }
    return Number(latest.nextBalance);
  }

  async generateMovementReport(
    filters: KardexFilterDto,
  ): Promise<InventoryMovementReport> {
    const result = await this.movementRepository.findAll({
      ...filters,
      page: 1,
      limit: 10000,
    });
    const items = result.items.map((item) => this.toHistory(item));
    const totalInboundQuantity = items
      .filter((item) => item.movementType === 'INBOUND')
      .reduce((acc, item) => acc + item.quantity, 0);
    const totalOutboundQuantity = items
      .filter((item) => item.movementType === 'OUTBOUND')
      .reduce((acc, item) => acc + item.quantity, 0);

    return {
      generatedAt: new Date(),
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      summary: {
        totalRecords: items.length,
        totalInboundQuantity,
        totalOutboundQuantity,
        netQuantity: totalInboundQuantity - totalOutboundQuantity,
      },
      items,
    };
  }

  private toHistory(item: any): MovementHistoryDto {
    return {
      id: item.id,
      movementType: item.movementType as any,
      movementReason: item.movementReason as any,
      quantity: Number(item.quantity),
      previousBalance: Number(item.previousBalance),
      nextBalance: Number(item.nextBalance),
      userId: item.userId,
      referenceId: item.referenceId ?? undefined,
      referenceType: item.referenceType ?? undefined,
      note: item.note ?? undefined,
      createdAt: item.createdAt,
    };
  }
}
