import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { MailService } from '../../../../application/mail/services/mail.service';
import { NotificationsGateway } from '../../../../application/notifications/gateways/notifications.gateway';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { KpiService } from '../../services/kpi.service';
import { InventoryEventName } from '../constants';

type ProductEventPayload = {
  productId: string;
  sku: string;
  name?: string;
  status?: string;
  changedFields?: string[];
  userId: string;
};

type StockAdjustedPayload = {
  productId: string;
  sku?: string;
  movementType: string;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  movementReason: string;
  userId: string;
};

type LowStockPayload = {
  productId: string;
  sku?: string;
  productName?: string;
  currentQuantity: number;
  minimumQuantity: number;
  supplierId?: string;
  supplierName?: string;
};

type PurchaseOrderReceivedPayload = {
  orderId: string;
  supplierId: string;
  userId: string;
};

type PurchaseSuggestionGeneratedPayload = {
  suggestions: Array<unknown>;
};

type DashboardUpdatedPayload = {
  data: unknown;
};

@Injectable()
export class InventoryEventListener {
  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly kpiService: KpiService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(InventoryEventName.PRODUCT_CREATED)
  async handleProductCreated(payload: ProductEventPayload): Promise<void> {
    this.notificationsGateway.sendToAdmins('inventory:product:created', {
      title: 'New Product',
      message: `Product ${payload.sku} - ${payload.name ?? ''} was created`,
      data: payload,
    });
    await this.kpiService.calculateTotalStockValue();
  }

  @OnEvent(InventoryEventName.PRODUCT_UPDATED)
  async handleProductUpdated(payload: ProductEventPayload): Promise<void> {
    this.notificationsGateway.sendToAdmins('inventory:product:updated', {
      title: 'Product Updated',
      message: `Product ${payload.sku} changed ${payload.changedFields?.length ?? 0} fields`,
      data: payload,
    });
  }

  @OnEvent(InventoryEventName.PRODUCT_DELETED)
  async handleProductDeleted(payload: ProductEventPayload): Promise<void> {
    this.notificationsGateway.sendToAdmins('inventory:product:deleted', {
      title: 'Product Deleted',
      message: `Product ${payload.sku} was deleted`,
      data: payload,
    });
    await this.kpiService.calculateTotalStockValue();
  }

  @OnEvent(InventoryEventName.STOCK_ADJUSTED)
  async handleStockAdjusted(payload: StockAdjustedPayload): Promise<void> {
    if (payload.movementReason === 'SALE') {
      this.notificationsGateway.broadcast('inventory:sale:registered', {
        message: `Stock updated for product ${payload.productId}`,
        data: payload,
      });
    }
  }

  @OnEvent(InventoryEventName.LOW_STOCK_ALERT)
  async handleLowStock(payload: LowStockPayload): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: payload.productId },
      include: {
        supplier: true,
      },
    });

    const admins = await this.prisma.user.findMany({
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

    await Promise.all(
      admins
        .map((admin) => ({
          email: admin.emails[0]?.email,
          name: admin.profile?.fullName ?? admin.username,
        }))
        .filter((admin) => Boolean(admin.email))
        .map((admin) =>
          this.mailService.sendOrderConfirmation({
            email: admin.email as string,
            customerName: admin.name,
            orderNumber: product?.sku ?? payload.sku ?? payload.productId,
            total: 0,
            items: [
              {
                name: `Low stock alert: ${product?.name ?? payload.productName ?? payload.productId}`,
                quantity: payload.currentQuantity,
                price: 0,
              },
            ],
          }),
        ),
    );

    this.notificationsGateway.sendToAdmins('inventory:low-stock', {
      productId: payload.productId,
      sku: product?.sku ?? payload.sku,
      currentQuantity: payload.currentQuantity,
      minimumQuantity: payload.minimumQuantity,
    });
  }

  @OnEvent(InventoryEventName.PURCHASE_ORDER_RECEIVED)
  async handlePurchaseOrderReceived(payload: PurchaseOrderReceivedPayload): Promise<void> {
    this.notificationsGateway.sendToAdmins('inventory:purchase-order:received', payload);
  }

  @OnEvent(InventoryEventName.PURCHASE_SUGGESTION_GENERATED)
  async handlePurchaseSuggestionGenerated(
    payload: PurchaseSuggestionGeneratedPayload,
  ): Promise<void> {
    if (payload.suggestions.length > 0) {
      this.notificationsGateway.sendToAdmins('inventory:purchase-suggestions', {
        totalItems: payload.suggestions.length,
      });
    }
  }

  @OnEvent(InventoryEventName.DASHBOARD_UPDATED)
  async handleDashboardUpdated(payload: DashboardUpdatedPayload): Promise<void> {
    this.notificationsGateway.broadcast('inventory:dashboard:updated', payload.data);
  }
}
