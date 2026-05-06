import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/services/auth.service';
import { EventTypes } from '../../../shared/events/event-types';
import {
  InventoryLowStockPayload,
  OrderCreatedPayload,
  PaymentReceivedPayload,
  RentalCreatedPayload,
} from '../../../shared/events';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  afterInit() {
    const wsOrigin = this.configService.get<string>('app.frontendUrl') ?? '*';
    this.logger.log(`WebSocket Gateway initialized (origin: ${wsOrigin})`);
  }

  async handleConnection(client: Socket) {
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
      const userId = user.id;
      client.data.userId = userId;
      client.data.role = user.role;

      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);

      let userSockets = this.connectedUsers.get(userId);
      if (!userSockets) {
        userSockets = new Set<string>();
        this.connectedUsers.set(userId, userSockets);
      }
      userSockets.add(client.id);
      client.join(`user:${userId}`);

      if (
        user.role === UserRole.ADMIN ||
        user.role === UserRole.MANAGER ||
        user.role === UserRole.EMPLOYEE
      ) {
        client.join('admin');
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    this.logger.log(`Client disconnected: ${client.id}`);

    if (!userId) {
      return;
    }

    const userSockets = this.connectedUsers.get(userId);
    if (!userSockets) {
      return;
    }

    userSockets.delete(client.id);
    if (userSockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }

  @OnEvent(EventTypes.ORDER_CREATED)
  handleOrderCreated(payload: OrderCreatedPayload) {
    this.server.to('admin').emit('order:created', payload);
    this.server.to(`user:${payload.userId}`).emit('order:created', payload);
  }

  @OnEvent(EventTypes.PAYMENT_RECEIVED)
  handlePaymentReceived(payload: PaymentReceivedPayload) {
    this.server.to('admin').emit('payment:received', payload);
    this.server.to(`user:${payload.userId}`).emit('payment:received', payload);
  }

  @OnEvent(EventTypes.RENTAL_CREATED)
  handleRentalCreated(payload: RentalCreatedPayload) {
    this.server.to('admin').emit('rental:created', payload);
    this.server.to(`user:${payload.userId}`).emit('rental:created', payload);
  }

  @OnEvent(EventTypes.INVENTORY_LOW_STOCK)
  handleLowStock(payload: InventoryLowStockPayload) {
    this.server.to('admin').emit('inventory:low-stock', payload);
  }

  sendToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToAdmins(event: string, data: unknown) {
    this.server.to('admin').emit(event, data);
  }

  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
