import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from '../dto';

type SupplierListFilters = {
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
  search?: string;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSupplierDto): Promise<Supplier> {
    return this.prisma.supplier.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        rating: data.rating,
      },
    });
  }

  async findAll(filters: SupplierListFilters = {}): Promise<PaginatedResult<Supplier>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.SupplierWhereInput = {
      deletedAt: filters.includeDeleted ? undefined : null,
      OR: filters.search
        ? [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { cnpj: { contains: filters.search } },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async findByCnpj(cnpj: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { cnpj },
    });
  }

  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    await this.findById(id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        cnpj: data.cnpj,
        rating: data.rating,
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateMetricsAfterPurchaseOrder(
    supplierId: string,
    metrics: {
      orderTotalAmount: number;
      totalItemsPurchased: number;
      deliveredOnTime: boolean;
    },
  ): Promise<void> {
    await this.findById(supplierId);
    await this.prisma.supplier.update({
      where: { id: supplierId },
      data: {
        totalOrders: { increment: 1 },
        accumulatedValue: { increment: new Prisma.Decimal(metrics.orderTotalAmount) },
        totalItemsPurchased: { increment: metrics.totalItemsPurchased },
        onTimeDeliveries: metrics.deliveredOnTime ? { increment: 1 } : undefined,
      },
    });
  }
}
