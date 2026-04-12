import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRole } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../../application/auth/services/auth.service';
import { InventoryEventName } from '../events/constants';

type NotificationDto = {
  type: string;
  title?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: Date;
};

type LowStockAlertDto = {
  productId: string;
  sku?: string;
  currentQuantity: number;
  minimumQuantity: number;
  timestamp?: Date;
};

type DashboardUpdatedDto = Record<string, unknown>;
type ProductUpdatedDto = Record<string, unknown>;
type PurchaseOrderStatusDto = Record<string, unknown>;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/inventory',
})
export class InventoryWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authToken = (client.handshake.auth?.token as string | undefined) ?? '';
      const headerToken = (client.handshake.headers?.authorization as string | undefined) ?? '';
      const rawToken = authToken || headerToken;
      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice('Bearer '.length)
        : rawToken;

      if (!token) {
        client.disconnect(true);
        return;
      }

      const user = await this.authService.validateToken(token);
      client.data.user = user;
      client.data.roles = user.roles;

      if (user.roles.includes(UserRole.ADMIN)) {
        client.join('admins');
      }
      if (user.roles.includes(UserRole.EMPLOYEE)) {
        client.join('employees');
      }

      client.emit('connected', {
        userId: user.id,
        timestamp: new Date(),
      });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket): void {}

  notifyAdmins(notification: NotificationDto): void {
    this.server.to('admins').emit('notification', {
      ...notification,
      timestamp: notification.timestamp ?? new Date(),
    });
  }

  notifyAll(notification: NotificationDto): void {
    this.server.emit('notification', {
      ...notification,
      timestamp: notification.timestamp ?? new Date(),
    });
  }

  sendLowStockAlert(alert: LowStockAlertDto): void {
    this.server.to('admins').emit('low_stock_alert', {
      ...alert,
      timestamp: alert.timestamp ?? new Date(),
    });
  }

  broadcastDashboard(data: DashboardUpdatedDto): void {
    this.server.emit('dashboard_updated', data);
  }

  notifyProductUpdated(product: ProductUpdatedDto): void {
    this.server.emit('product_updated', product);
  }

  notifyPurchaseOrderStatus(order: PurchaseOrderStatusDto): void {
    this.server.to('admins').emit('purchase_order_status', order);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): void {
    client.join(room);
    client.emit('room-joined', { room });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): void {
    client.leave(room);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  @OnEvent(InventoryEventName.DASHBOARD_UPDATED)
  handleDashboardUpdated(payload: { data?: DashboardUpdatedDto }): void {
    this.broadcastDashboard(payload?.data ?? {});
  }

  @OnEvent(InventoryEventName.PRODUCT_UPDATED)
  handleProductUpdated(payload: ProductUpdatedDto): void {
    this.notifyProductUpdated(payload);
  }

  @OnEvent(InventoryEventName.LOW_STOCK_ALERT)
  handleLowStockAlert(payload: LowStockAlertDto): void {
    this.sendLowStockAlert(payload);
  }

  @OnEvent(InventoryEventName.PURCHASE_ORDER_RECEIVED)
  handlePurchaseOrderReceived(payload: PurchaseOrderStatusDto): void {
    this.notifyPurchaseOrderStatus(payload);
  }
}

export { InventoryWebSocketGateway as EstoqueWebSocketGateway };
