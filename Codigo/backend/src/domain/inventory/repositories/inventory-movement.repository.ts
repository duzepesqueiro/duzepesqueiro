import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovement, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateInventoryMovementDto,
  KardexFilterDto,
} from '../dto';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class InventoryMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateInventoryMovementDto,
    userId: string,
  ): Promise<InventoryMovement> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { id: true, deletedAt: true, stockQuantity: true },
      });
      if (!product || product.deletedAt) {
        throw new NotFoundException('Product not found');
      }

      const previousBalance = Number(product.stockQuantity);
      const delta =
        dto.movementType === 'INBOUND' ? dto.quantity : -Math.abs(dto.quantity);
      const nextBalance = previousBalance + delta;
      if (nextBalance < 0) {
        throw new ForbiddenException('Insufficient stock for outbound movement');
      }

      await tx.product.update({
        where: { id: dto.productId },
        data: { stockQuantity: new Prisma.Decimal(nextBalance) },
      });

      return tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          movementType: dto.movementType as any,
          movementReason: dto.movementReason as any,
          quantity: new Prisma.Decimal(Math.abs(dto.quantity)),
          previousBalance: new Prisma.Decimal(previousBalance),
          nextBalance: new Prisma.Decimal(nextBalance),
          referenceId: dto.referenceId,
          referenceType: dto.referenceType,
          userId,
          note: dto.note,
        },
      });
    });
  }

  async findByProduct(
    productId: string,
    filters: KardexFilterDto,
  ): Promise<PaginatedResult<InventoryMovement>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.InventoryMovementWhereInput = {
      productId,
      movementType: filters.movementType as any,
      movementReason: filters.movementReason as any,
      createdAt:
        filters.startDate || filters.endDate
          ? {
              gte: filters.startDate ? new Date(filters.startDate) : undefined,
              lte: filters.endDate ? new Date(filters.endDate) : undefined,
            }
          : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(filters: KardexFilterDto): Promise<PaginatedResult<InventoryMovement>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.InventoryMovementWhereInput = {
      productId: filters.productId,
      movementType: filters.movementType as any,
      movementReason: filters.movementReason as any,
      createdAt:
        filters.startDate || filters.endDate
          ? {
              gte: filters.startDate ? new Date(filters.startDate) : undefined,
              lte: filters.endDate ? new Date(filters.endDate) : undefined,
            }
          : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async calculatePreviousBalance(productId: string): Promise<number> {
    const lastMovement = await this.findLatestMovement(productId);
    if (!lastMovement) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true, deletedAt: true },
      });
      if (!product || product.deletedAt) {
        throw new NotFoundException('Product not found');
      }
      return Number(product.stockQuantity);
    }
    return Number(lastMovement.nextBalance);
  }

  async findLatestMovement(productId: string): Promise<InventoryMovement | null> {
    return this.prisma.inventoryMovement.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
