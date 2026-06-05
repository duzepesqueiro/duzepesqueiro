import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product, ProductCategory } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreateProductDto,
  ProductListFilterDto,
  UpdateProductDto,
} from '../dto';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProductDto, userId: string): Promise<Product> {
    await this.ensureSupplierExists(data.supplierId);
    const payload: any = {
      sku: await this.generateSku(data.category),
      name: data.name,
      description: data.description,
      status: data.status as any,
      category: data.category as any,
      unitMeasure: data.unitMeasure as any,
      stockQuantity: new Prisma.Decimal(data.stockQuantity ?? 0),
      minimumLimit: new Prisma.Decimal(data.minimumLimit ?? 0),
      suggestedQuantity: new Prisma.Decimal(data.suggestedQuantity ?? 0),
      costPrice: new Prisma.Decimal(data.costPrice),
      salePrice: new Prisma.Decimal(data.salePrice),
      location: data.location,
      restockDate: data.restockDate ? new Date(data.restockDate) : null,
      supplierId: data.supplierId,
      createdById: userId,
      editedById: null,
      turnoverRate: (data.turnoverRate as any) ?? 'MEDIUM',
    };
    return this.prisma.product.create({
      data: {
        ...payload,
      },
      include: {
        supplier: true,
        productImages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findAll(filters: ProductListFilterDto): Promise<PaginatedResult<Product>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.ProductWhereInput = {
      deletedAt: filters.includeDeleted ? undefined : null,
      status: filters.status as any,
      category: filters.category as any,
      supplierId: filters.supplierId,
      turnoverRate: filters.turnoverRate as any,
      OR: filters.search
        ? [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { sku: { contains: filters.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    if (filters.lowStockOnly) {
      const all = await this.prisma.product.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          productImages: { orderBy: { createdAt: 'asc' } },
        },
      });
      const lowStockItems = all.filter(
        (item) => Number(item.stockQuantity) < Number(item.minimumLimit),
      );
      const paginated = lowStockItems.slice((page - 1) * limit, page * limit);
      return {
        items: paginated,
        total: lowStockItems.length,
        page,
        limit,
        totalPages: Math.ceil(lowStockItems.length / limit),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          productImages: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        rentalInventory: true,
        productImages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { sku },
      include: {
        supplier: true,
        productImages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async update(id: string, data: UpdateProductDto, userId: string): Promise<Product> {
    await this.ensureProductExists(id);
    if (data.supplierId) {
      await this.ensureSupplierExists(data.supplierId);
    }
    const payload: any = {
      name: data.name,
      description: data.description,
      status: data.status as any,
      category: data.category as any,
      unitMeasure: data.unitMeasure as any,
      stockQuantity:
        data.stockQuantity !== undefined
          ? new Prisma.Decimal(data.stockQuantity)
          : undefined,
      minimumLimit:
        data.minimumLimit !== undefined
          ? new Prisma.Decimal(data.minimumLimit)
          : undefined,
      suggestedQuantity:
        data.suggestedQuantity !== undefined
          ? new Prisma.Decimal(data.suggestedQuantity)
          : undefined,
      costPrice:
        data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : undefined,
      salePrice:
        data.salePrice !== undefined ? new Prisma.Decimal(data.salePrice) : undefined,
      location: data.location,
      restockDate: data.restockDate ? new Date(data.restockDate) : undefined,
      supplierId: data.supplierId,
      turnoverRate: data.turnoverRate as any,
      editedById: userId,
    };
    return this.prisma.product.update({
      where: { id },
      data: {
        ...payload,
      },
      include: {
        supplier: true,
        productImages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async updateWithOptimisticLock(
    id: string,
    data: UpdateProductDto,
    expectedVersion: number,
    userId: string,
  ): Promise<Product> {
    return this.prisma.$transaction(async (tx) => {
      const updatedLock = await tx.inventoryConcurrencyControl.updateMany({
        where: {
          productId: id,
          version: expectedVersion,
        },
        data: {
          version: { increment: 1 },
          lockedById: userId,
          lockExpiration: null,
        },
      });

      if (updatedLock.count === 0) {
        throw new ConflictException(
          'Product was modified by another user. Please retry.',
        );
      }

      const payload: any = {
        name: data.name,
        description: data.description,
        status: data.status as any,
        category: data.category as any,
        unitMeasure: data.unitMeasure as any,
        stockQuantity:
          data.stockQuantity !== undefined
            ? new Prisma.Decimal(data.stockQuantity)
            : undefined,
        minimumLimit:
          data.minimumLimit !== undefined
            ? new Prisma.Decimal(data.minimumLimit)
            : undefined,
        suggestedQuantity:
          data.suggestedQuantity !== undefined
            ? new Prisma.Decimal(data.suggestedQuantity)
            : undefined,
        costPrice:
          data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : undefined,
        salePrice:
          data.salePrice !== undefined ? new Prisma.Decimal(data.salePrice) : undefined,
        location: data.location,
        restockDate: data.restockDate ? new Date(data.restockDate) : undefined,
        supplierId: data.supplierId,
        turnoverRate: data.turnoverRate as any,
        editedById: userId,
      };
      return tx.product.update({
        where: { id },
        data: payload,
        include: {
          supplier: true,
          productImages: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  async updateImage(id: string, image: string | null, userId: string): Promise<Product> {
    await this.ensureProductExists(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        image: image as any,
        editedById: userId,
      } as any,
      include: {
        supplier: true,
        productImages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async countImages(productId: string): Promise<number> {
    return this.prisma.productImage.count({
      where: { productId },
    });
  }

  async addImage(productId: string, imageUrl: string): Promise<void> {
    await this.prisma.productImage.create({
      data: { productId, imageUrl },
    });
  }

  async listImages(productId: string): Promise<string[]> {
    const rows = await this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
      select: { imageUrl: true },
    });
    return rows.map((row) => row.imageUrl);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.ensureProductExists(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), editedById: userId },
    });
  }

  async decrementStock(id: string, quantity: number): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity: { decrement: new Prisma.Decimal(quantity) } },
    });
  }

  async incrementStock(id: string, quantity: number): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity: { increment: new Prisma.Decimal(quantity) } },
    });
  }

  async findLowStockProducts(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { supplier: { select: { id: true, name: true } } },
    });
    return products.filter(
      (product) => Number(product.stockQuantity) < Number(product.minimumLimit),
    );
  }

  async findAgedProducts(days: number): Promise<Product[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    const latestMovements = await this.prisma.inventoryMovement.groupBy({
      by: ['productId'],
      _max: { createdAt: true },
    });

    const staleIds = latestMovements
      .filter((movement) => !movement._max.createdAt || movement._max.createdAt < threshold)
      .map((movement) => movement.productId);

    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [{ id: { in: staleIds } }, { inventoryMovements: { none: {} } }],
      },
      include: { supplier: true },
    });
  }

  async calculateTotalStockValue(): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: { stockQuantity: true, costPrice: true, salePrice: true },
    });

    return products.reduce(
      (total, product) => {
        const costPrice = Number(product.costPrice);
        const salePrice = Number(product.salePrice);
        const unitValue = costPrice > 0 ? costPrice : salePrice;
        return total + Number(product.stockQuantity) * unitValue;
      },
      0,
    );
  }

  private async generateSku(category: ProductCategory): Promise<string> {
    const prefixByCategory: Record<ProductCategory, string> = {
      FISHING_EQUIPMENT: 'FE',
      FOOD: 'FD',
      RENTAL_EQUIPMENT: 'RE',
      EVENT_ITEM: 'EV',
      HOSTING_ITEM: 'HS',
      DRINK: 'DK',
      ACCESSORY: 'AC',
      CLEANING_MATERIAL: 'CM',
      OTHER: 'OT',
    };

    const prefix = prefixByCategory[category] ?? 'OT';
    const lastSku = await this.prisma.product.findFirst({
      where: { sku: { startsWith: `${prefix}-` } },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    let sequence = 1;
    if (lastSku?.sku) {
      const parsed = Number.parseInt(lastSku.sku.split('-')[1], 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
  }

  private async ensureSupplierExists(supplierId: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, deletedAt: true },
    });
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('Supplier not found');
    }
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
