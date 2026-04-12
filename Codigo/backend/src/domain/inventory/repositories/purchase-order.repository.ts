import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryMovementReason,
  InventoryMovementType,
  Prisma,
  PurchaseOrder,
} from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto';

type PurchaseOrderFilters = {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: string;
  deliveryStatus?: string;
  fromDate?: string;
  toDate?: string;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    supplier: true;
    items: { include: { product: true } };
  };
}>;

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    await this.ensureSupplierExists(dto.supplierId);
    await this.ensureProductsExist(dto.items.map((item) => item.productId));

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: dto.items.map((item) => item.productId) } },
        select: { id: true, costPrice: true },
      });
      const priceByProduct = new Map(
        products.map((product) => [product.id, Number(product.costPrice)]),
      );

      const totalAmount = dto.items.reduce((acc, item) => {
        const unitPrice = item.unitPrice ?? priceByProduct.get(item.productId) ?? 0;
        return acc + unitPrice * item.quantity;
      }, 0);

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          status: 'PENDING',
          deliveryStatus: 'PARTIAL',
          priority: dto.priority as any,
          orderDate: new Date(),
          expectedDelivery: new Date(dto.expectedDeliveryDate),
          totalAmount: new Prisma.Decimal(totalAmount),
          note: dto.note,
        },
      });

      for (const item of dto.items) {
        const fallbackUnitPrice = priceByProduct.get(item.productId) ?? 0;
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: purchaseOrder.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice ?? fallbackUnitPrice),
            receivedQuantity: new Prisma.Decimal(0),
          },
        });
      }

      return purchaseOrder;
    });
  }

  async findAll(
    filters: PurchaseOrderFilters = {},
  ): Promise<PaginatedResult<PurchaseOrderWithRelations>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
      supplierId: filters.supplierId,
      status: filters.status as any,
      deliveryStatus: filters.deliveryStatus as any,
      orderDate:
        filters.fromDate || filters.toDate
          ? {
              gte: filters.fromDate ? new Date(filters.fromDate) : undefined,
              lte: filters.toDate ? new Date(filters.toDate) : undefined,
            }
          : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { supplier: true, items: { include: { product: true } } },
        orderBy: { orderDate: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<PurchaseOrderWithRelations> {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { product: true } } },
    });
    if (!order || order.deletedAt) {
      throw new NotFoundException('Purchase order not found');
    }
    return order;
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    await this.findById(id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status as any,
        deliveryStatus: dto.deliveryStatus as any,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
        note: dto.note,
      },
    });
  }

  async receiveItems(
    id: string,
    dto: ReceivePurchaseOrderDto,
    userId: string,
  ): Promise<PurchaseOrderWithRelations> {
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const orderItem = await tx.purchaseOrderItem.findUnique({
          where: { id: item.itemId },
          select: {
            id: true,
            purchaseOrderId: true,
            productId: true,
            quantity: true,
            receivedQuantity: true,
          },
        });
        if (!orderItem || orderItem.purchaseOrderId !== id) {
          throw new NotFoundException('Purchase order item not found');
        }
        const delta = item.receivedQuantity;
        if (delta <= 0) {
          continue;
        }

        const nextReceived =
          Number(orderItem.receivedQuantity) + delta;
        const totalOrdered = Number(orderItem.quantity);
        if (nextReceived > totalOrdered) {
          throw new NotFoundException('Received quantity exceeds ordered quantity');
        }

        const product = await tx.product.findUnique({
          where: { id: orderItem.productId },
          select: { id: true, stockQuantity: true, deletedAt: true },
        });
        if (!product || product.deletedAt) {
          throw new NotFoundException('Product not found for purchase order item');
        }
        const previousBalance = Number(product.stockQuantity);
        const nextBalance = previousBalance + delta;

        await tx.purchaseOrderItem.update({
          where: { id: item.itemId },
          data: {
            receivedQuantity: new Prisma.Decimal(nextReceived),
          },
        });

        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            stockQuantity: new Prisma.Decimal(nextBalance),
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: orderItem.productId,
            movementType: InventoryMovementType.INBOUND,
            movementReason: InventoryMovementReason.PURCHASE,
            quantity: new Prisma.Decimal(delta),
            previousBalance: new Prisma.Decimal(previousBalance),
            nextBalance: new Prisma.Decimal(nextBalance),
            referenceId: id,
            referenceType: 'PURCHASE_ORDER_RECEIPT',
            userId,
            note: dto.note,
          },
        });
      }

      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
        select: { quantity: true, receivedQuantity: true },
      });
      const allReceived = items.every(
        (item) => Number(item.receivedQuantity) >= Number(item.quantity),
      );

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: allReceived ? 'RECEIVED' : 'APPROVED',
          deliveryStatus: allReceived ? 'COMPLETE' : 'PARTIAL',
          deliveredAt: allReceived ? new Date() : undefined,
          note: dto.note,
        },
      });

      const totalAmount = await this.calculateTotalAmountWithTx(id, tx);
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          totalAmount: new Prisma.Decimal(totalAmount),
        },
      });
      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });
  }

  async calculateTotalAmount(id: string): Promise<number> {
    return this.calculateTotalAmountWithTx(id, this.prisma);
  }

  private async calculateTotalAmountWithTx(
    id: string,
    tx: PrismaService | Prisma.TransactionClient,
  ): Promise<number> {
    const items = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
      select: { quantity: true, unitPrice: true },
    });
    return items.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
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

  private async ensureProductsExist(productIds: string[]): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }
  }
}
