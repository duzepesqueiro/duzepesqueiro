import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { LogsService } from '../../../application/logs/services';
import { MailService } from '../../../application/mail/services/mail.service';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderResponseDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto';
import { InventoryEventName } from '../events';
import { PurchaseOrderRepository, SupplierRepository } from '../repositories';
import { SupplierService } from './supplier.service';

type CurrentUser = {
  id: string;
  email?: string;
  role?: string;
};

type PurchaseOrderFilters = {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: string;
  deliveryStatus?: string;
  fromDate?: string;
  toDate?: string;
};

type PurchaseSuggestionItem = {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  minimumLimit: number;
  suggestedQuantity: number;
  turnoverRate: 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
};

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly supplierService: SupplierService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logsService: LogsService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreatePurchaseOrderDto,
    user: CurrentUser,
  ): Promise<PurchaseOrderResponseDto> {
    await this.supplierRepository.findById(dto.supplierId);
    const created = await this.purchaseOrderRepository.create(dto);
    const order = await this.purchaseOrderRepository.findById(created.id);

    this.eventEmitter.emit('purchase.order.created', {
      orderId: order.id,
      supplierId: order.supplierId,
      userId: user.id,
    });

    const createdAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'PurchaseOrderCreated',
      {
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: order.id,
        author: createdAuthor,
        changes: {
          purchaseOrder: {
            old: null,
            new: {
              id: order.id,
              supplierId: order.supplierId,
              totalAmount: Number(order.totalAmount),
            },
          },
        },
        description: `Purchase order ${order.id} created`,
      },
      order.id,
      {
        source: 'inventory.purchase-order.service',
        userId: createdAuthor.userId,
      },
    );

    await this.notifySupplier(order.id);
    return this.toResponse(order as any);
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
    user: CurrentUser,
  ): Promise<PurchaseOrderResponseDto> {
    const previous = await this.purchaseOrderRepository.findById(id);
    const updated = await this.purchaseOrderRepository.updateStatus(id, dto);
    const order = await this.purchaseOrderRepository.findById(updated.id);

    this.eventEmitter.emit('purchase.order.updated', {
      orderId: id,
      userId: user.id,
      changedFields: Object.keys(dto),
    });

    const updatedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'PurchaseOrderUpdated',
      {
        action: 'UPDATE',
        entity: 'PurchaseOrder',
        entityId: id,
        author: updatedAuthor,
        changes: this.calculateDifferences(previous, order),
        description: `Purchase order ${id} updated`,
      },
      id,
      {
        source: 'inventory.purchase-order.service',
        userId: updatedAuthor.userId,
      },
    );

    return this.toResponse(order as any);
  }

  async cancel(id: string, user: CurrentUser): Promise<PurchaseOrderResponseDto> {
    const cancelled = await this.purchaseOrderRepository.updateStatus(id, {
      status: 'CANCELLED' as any,
      note: 'Cancelled by user request',
    });
    const order = await this.purchaseOrderRepository.findById(cancelled.id);

    this.eventEmitter.emit('purchase.order.cancelled', {
      orderId: id,
      supplierId: order.supplierId,
      userId: user.id,
    });

    const cancelledAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.warn(
      'inventory',
      'PurchaseOrderCancelled',
      {
        action: 'UPDATE',
        entity: 'PurchaseOrder',
        entityId: id,
        author: cancelledAuthor,
        changes: { status: { old: 'PENDING', new: 'CANCELLED' } },
        description: `Purchase order ${id} cancelled`,
      },
      id,
      {
        source: 'inventory.purchase-order.service',
        userId: cancelledAuthor.userId,
      },
    );

    return this.toResponse(order as any);
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    user: CurrentUser,
  ): Promise<PurchaseOrderResponseDto> {
    const received = await this.purchaseOrderRepository.receiveItems(id, dto, user.id);
    const order = await this.purchaseOrderRepository.findById(received.id);

    const totalItems = order.items.reduce(
      (acc: number, item: any) => acc + Number(item.receivedQuantity),
      0,
    );
    await this.supplierService.updateMetrics(
      order.supplierId,
      Number(order.totalAmount),
      totalItems,
    );
    await this.supplierService.calculatePunctuality(order.supplierId);

    this.eventEmitter.emit('purchase.order.received', {
      orderId: id,
      supplierId: order.supplierId,
      userId: user.id,
    });
    this.eventEmitter.emit(InventoryEventName.PURCHASE_ORDER_RECEIVED, {
      orderId: id,
      supplierId: order.supplierId,
      userId: user.id,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        receivedQuantity: Number(item.receivedQuantity),
      })),
    });

    const receivedAuthor = await this.resolveAuditAuthor(user);
    await this.logsService.info(
      'inventory',
      'PurchaseOrderReceived',
      {
        action: 'UPDATE',
        entity: 'PurchaseOrder',
        entityId: id,
        author: receivedAuthor,
        changes: {
          status: { old: 'APPROVED', new: order.status },
          deliveryStatus: { old: 'PARTIAL', new: order.deliveryStatus },
        },
        description: `Purchase order ${id} received`,
      },
      id,
      {
        source: 'inventory.purchase-order.service',
        userId: receivedAuthor.userId,
      },
    );

    return this.toResponse(order as any);
  }

  async list(filters: PurchaseOrderFilters): Promise<{
    items: PurchaseOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.purchaseOrderRepository.findAll(filters);
    return {
      items: result.items.map((item: any) => this.toResponse(item)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async get(id: string): Promise<PurchaseOrderResponseDto> {
    const order = await this.purchaseOrderRepository.findById(id);
    return this.toResponse(order as any);
  }

  calculateTotalAmount(
    items: Array<{ quantity: number; unitPrice?: number }>,
  ): number {
    return items.reduce(
      (acc, item) => acc + item.quantity * (item.unitPrice ?? 0),
      0,
    );
  }

  async generatePurchaseSuggestions(): Promise<{
    generatedAt: Date;
    totalSuggestions: number;
    items: PurchaseSuggestionItem[];
  }> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        stockQuantity: true,
        minimumLimit: true,
        suggestedQuantity: true,
        turnoverRate: true,
      },
    });

    const priorityMap = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

    const suggestions = products
      .filter((product) => Number(product.stockQuantity) < Number(product.minimumLimit))
      .map((product) => {
        const deficit = Number(product.minimumLimit) - Number(product.stockQuantity);
        const suggestedQuantity = Math.max(
          deficit,
          Number(product.suggestedQuantity || 0),
        );
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          currentStock: Number(product.stockQuantity),
          minimumLimit: Number(product.minimumLimit),
          suggestedQuantity,
          turnoverRate: product.turnoverRate as 'HIGH' | 'MEDIUM' | 'LOW',
          priorityScore: priorityMap[product.turnoverRate as 'HIGH' | 'MEDIUM' | 'LOW'],
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const response = {
      generatedAt: new Date(),
      totalSuggestions: suggestions.length,
      items: suggestions,
    };
    this.eventEmitter.emit(InventoryEventName.PURCHASE_SUGGESTION_GENERATED, {
      suggestions: response.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        currentQuantity: item.currentStock,
        minimumLimit: item.minimumLimit,
        suggestedQuantity: item.suggestedQuantity,
        turnoverRate: item.turnoverRate,
        priority:
          item.priorityScore >= 3
            ? 'HIGH'
            : item.priorityScore === 2
              ? 'MEDIUM'
              : 'LOW',
      })),
      timestamp: new Date(),
    });
    return response;
  }

  async notifySupplier(orderId: string): Promise<void> {
    const order = await this.purchaseOrderRepository.findById(orderId);
    const recipient = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN, isActive: true },
      include: {
        profile: true,
        emails: {
          where: { isVerified: true },
          orderBy: { isPrimary: 'desc' },
          take: 1,
        },
      },
    });

    const email = recipient?.emails[0]?.email;
    if (!email) {
      throw new NotFoundException('No recipient email found for supplier notification');
    }

    await this.mailService.sendOrderConfirmation({
      email,
      customerName: order.supplier.name,
      orderNumber: order.id,
      total: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        name: item.product?.name ?? item.productId,
        quantity: Number(item.quantity),
        price: Number(item.unitPrice),
      })),
    });
  }

  private toResponse(order: any): PurchaseOrderResponseDto {
    return {
      id: order.id,
      supplierId: order.supplierId,
      status: order.status as any,
      deliveryStatus: order.deliveryStatus as any,
      priority: order.priority as any,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDelivery,
      deliveredAt: order.deliveredAt ?? undefined,
      totalAmount: Number(order.totalAmount),
      note: order.note ?? undefined,
      supplier: {
        id: order.supplier.id,
        name: order.supplier.name,
        cnpj: order.supplier.cnpj,
      },
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        receivedQuantity: Number(item.receivedQuantity),
        note: item.note ?? undefined,
        product: {
          id: item.product?.id ?? item.productId,
          sku: item.product?.sku ?? '',
          name: item.product?.name ?? '',
        },
        createdAt: item.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deletedAt: order.deletedAt ?? undefined,
    };
  }

  private calculateDifferences(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Record<string, { old: unknown; new: unknown }> {
    const fields = ['status', 'deliveryStatus', 'deliveredAt', 'note'];
    return fields.reduce<Record<string, { old: unknown; new: unknown }>>((acc, field) => {
      if (String(previous[field]) !== String(current[field])) {
        acc[field] = { old: previous[field], new: current[field] };
      }
      return acc;
    }, {});
  }

  private async resolveAuditAuthor(user: CurrentUser): Promise<{
    userId: string;
    name: string;
    email: string;
  }> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        emails: { orderBy: { isPrimary: 'desc' }, take: 1 },
      },
    });
    if (!dbUser) {
      throw new NotFoundException('User not found');
    }
    const email = dbUser.emails[0]?.email ?? user.email;
    if (!email) {
      throw new ConflictException('Unable to resolve user email for audit log');
    }
    return {
      userId: dbUser.id,
      name: dbUser.profile?.fullName ?? dbUser.username,
      email,
    };
  }
}
