import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ListSalesOrdersDto } from '../dto/user';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  itemsPerPage: number;
  totalPages: number;
};

@Injectable()
export class SalesOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: { items: Array<{ productId: string; quantity: number }>; note?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await (tx as any).salesOrder.create({
        data: {
          userId,
          note: input.note,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          totalAmount: new Prisma.Decimal(0),
        },
        include: { items: true },
      });

      let totalAmount = new Prisma.Decimal(0);

      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            deletedAt: true,
            status: true,
            name: true,
            image: true,
            salePrice: true,
            stockQuantity: true,
          },
        });

        if (!product || product.deletedAt) {
          throw new NotFoundException('Product not found');
        }
        if (product.status !== ProductStatus.SALE) {
          throw new ConflictException('Produto não está disponível para venda');
        }

        const currentStock = Number(product.stockQuantity);
        if (currentStock < item.quantity) {
          throw new ForbiddenException('Estoque insuficiente para finalizar pedido');
        }

        const previousBalance = currentStock;
        const nextBalance = previousBalance - Math.abs(item.quantity);

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: new Prisma.Decimal(nextBalance) },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            movementType: 'OUTBOUND',
            movementReason: 'SALE',
            quantity: new Prisma.Decimal(Math.abs(item.quantity)),
            previousBalance: new Prisma.Decimal(previousBalance),
            nextBalance: new Prisma.Decimal(nextBalance),
            referenceId: order.id,
            referenceType: 'sales_order',
            userId,
            note: 'Pedido de venda criado',
          },
        });

        const unitPrice = new Prisma.Decimal(product.salePrice);
        const subtotal = unitPrice.mul(new Prisma.Decimal(item.quantity));
        totalAmount = totalAmount.add(subtotal);

        await (tx as any).salesOrderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            subtotal,
            nameSnapshot: product.name,
            imageSnapshot: product.image ?? null,
          },
        });
      }

      return (tx as any).salesOrder.update({
        where: { id: order.id },
        data: { totalAmount },
        include: { items: true },
      });
    });
  }

  async findByIdForUser(userId: string, id: string) {
    const record = await (this.prisma as any).salesOrder.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!record) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return record;
  }

  async listByUser(userId: string, filters: ListSalesOrdersDto): Promise<PaginatedResult<any>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;

    const where: any = {
      userId,
      status: filters.status ?? undefined,
      paymentStatus: filters.paymentStatus ?? undefined,
      id: filters.search
        ? { contains: String(filters.search).trim(), mode: 'insensitive' }
        : undefined,
    };

    const [items, total] = await Promise.all([
      (this.prisma as any).salesOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      (this.prisma as any).salesOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      itemsPerPage: limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async cancelForUser(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await (tx as any).salesOrder.findFirst({
        where: { id, userId },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException('Pedido não encontrado');
      }
      if (order.status !== 'PENDING' || order.paymentStatus !== 'PENDING') {
        throw new ConflictException('Pedido não pode ser cancelado neste estado');
      }

      for (const item of order.items ?? []) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, deletedAt: true, stockQuantity: true },
        });
        if (!product || product.deletedAt) {
          continue;
        }

        const previousBalance = Number(product.stockQuantity);
        const nextBalance = previousBalance + Math.abs(Number(item.quantity));

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: new Prisma.Decimal(nextBalance) },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            movementType: 'INBOUND',
            movementReason: 'RETURN',
            quantity: new Prisma.Decimal(Math.abs(Number(item.quantity))),
            previousBalance: new Prisma.Decimal(previousBalance),
            nextBalance: new Prisma.Decimal(nextBalance),
            referenceId: order.id,
            referenceType: 'sales_order_cancel',
            userId,
            note: 'Cancelamento de pedido de venda',
          },
        });
      }

      return (tx as any).salesOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: { items: true },
      });
    });
  }
}
