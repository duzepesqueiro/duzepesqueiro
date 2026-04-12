import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RentalInventory } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateRentalInventoryDto,
  PerformInspectionDto,
  UpdateRentalInventoryDto,
} from '../dto';

type RentalInventoryFilters = {
  page?: number;
  limit?: number;
  quality?: string;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RentalInventoryWithProduct = Prisma.RentalInventoryGetPayload<{
  include: { product: true };
}>;

@Injectable()
export class RentalInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRentalInventoryDto): Promise<RentalInventory> {
    await this.ensureProductExists(dto.productId);
    return this.prisma.rentalInventory.create({
      data: {
        productId: dto.productId,
        quality: dto.quality as any,
        lastVerification: new Date(),
        note: dto.note,
      },
    });
  }

  async findByProductId(productId: string): Promise<RentalInventoryWithProduct> {
    const item = await this.prisma.rentalInventory.findUnique({
      where: { productId },
      include: { product: true },
    });
    if (!item || item.product.deletedAt) {
      throw new NotFoundException('Rental inventory record not found');
    }
    return item;
  }

  async update(
    productId: string,
    dto: UpdateRentalInventoryDto,
  ): Promise<RentalInventory> {
    await this.findByProductId(productId);
    return this.prisma.rentalInventory.update({
      where: { productId },
      data: {
        quality: dto.quality as any,
        note: dto.note,
      },
    });
  }

  async findAll(
    filters: RentalInventoryFilters = {},
  ): Promise<PaginatedResult<RentalInventoryWithProduct>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where = {
      quality: filters.quality as any,
      product: { deletedAt: null },
    };

    const [items, total] = await Promise.all([
      this.prisma.rentalInventory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { product: true },
        orderBy: { lastVerification: 'desc' },
      }),
      this.prisma.rentalInventory.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async performInspection(
    productId: string,
    dto: PerformInspectionDto,
  ): Promise<RentalInventory> {
    await this.findByProductId(productId);
    return this.prisma.rentalInventory.update({
      where: { productId },
      data: {
        quality: dto.newQuality as any,
        note: dto.note,
        lastVerification: new Date(),
      },
    });
  }

  private async ensureProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, deletedAt: true },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
  }
}
