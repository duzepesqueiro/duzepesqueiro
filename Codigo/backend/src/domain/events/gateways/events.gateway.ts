import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { LogsService } from '../../../application/logs/services';

type AuthUser = {
  id: string;
  role: string;
  email?: string;
};

type RateLimitState = {
  startedAt: number;
  count: number;
};

@Injectable()
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: (origin, callback) => {
      const allowed = (process.env.WEBSOCKET_ALLOWED_ORIGINS ?? '*')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!origin) return callback(null, true);
      if (allowed.includes('*')) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  pingInterval: 25_000,
  pingTimeout: 60_000,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  connectedClients: Map<string, Socket> = new Map();
  adminClients: Set<string> = new Set();
  userClients: Set<string> = new Set();

  private readonly logger = new Logger(EventsGateway.name);
  private readonly roomsByClient = new Map<string, Set<string>>();
  private readonly rateLimitByClient = new Map<string, RateLimitState>();
  private readonly heartbeatByClient = new Map<string, number>();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('EventsGateway inicializado');
    server.use((socket, next) => {
      try {
        const user = this.validateClientToken(socket);
        (socket.data as any).user = user;
        next();
      } catch (error) {
        next(error as Error);
      }
    });
    this.startHeartbeatLoop();
  }

  handleConnection(client: Socket): void {
    try {
      const user = (client.data as any).user as AuthUser;
      if (!user) {
        throw new UnauthorizedException('Cliente não autenticado');
      }

      this.connectedClients.set(client.id, client);
      this.heartbeatByClient.set(client.id, Date.now());

      const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
      if (isAdmin) {
        this.adminClients.add(client.id);
        client.join('events:admins');
      } else {
        this.userClients.add(client.id);
        client.join('events:users');
      }
      client.join(`events:user:${user.id}`);

      client.emit('events:connection', {
        connected: true,
        clientId: client.id,
        role: user.role,
      });
      void this.logsService.info('events', 'EventsGatewayClientConnected', {
        clientId: client.id,
        userId: user.id,
        role: user.role,
      });
    } catch (error) {
      this.logger.warn(`Conexão recusada client=${client.id}`);
      client.emit('events:error', { message: 'Autenticação inválida' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.handleDisconnection(client);
  }

  handleDisconnection(client: Socket): void {
    this.connectedClients.delete(client.id);
    this.adminClients.delete(client.id);
    this.userClients.delete(client.id);
    this.roomsByClient.delete(client.id);
    this.rateLimitByClient.delete(client.id);
    this.heartbeatByClient.delete(client.id);
    void this.logsService.info('events', 'EventsGatewayClientDisconnected', {
      clientId: client.id,
    });
  }

  emitToAdmins(event: string, data: unknown): void {
    this.server.to('events:admins').emit(event, data);
  }

  emitToUsers(event: string, data: unknown): void {
    this.server.to('events:users').emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  emitToClient(clientId: string, event: string, data: unknown): void {
    const client = this.connectedClients.get(clientId);
    if (!client) {
      return;
    }
    client.emit(event, data);
  }

  @SubscribeMessage('subscribe:event')
  handleEventSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() eventId: string,
  ): void {
    if (!this.guardMessageRate(client)) {
      return;
    }
    if (!eventId) {
      client.emit('events:error', { message: 'eventId é obrigatório' });
      return;
    }
    const room = `events:event:${eventId}`;
    client.join(room);
    const rooms = this.roomsByClient.get(client.id) ?? new Set<string>();
    rooms.add(room);
    this.roomsByClient.set(client.id, rooms);
    client.emit('events:subscribed', { eventId });
  }

  @SubscribeMessage('unsubscribe:event')
  handleEventUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() eventId: string,
  ): void {
    if (!this.guardMessageRate(client)) {
      return;
    }
    const room = `events:event:${eventId}`;
    client.leave(room);
    const rooms = this.roomsByClient.get(client.id);
    rooms?.delete(room);
    client.emit('events:unsubscribed', { eventId });
  }

  @SubscribeMessage('admin:dashboard')
  handleAdminDashboard(@ConnectedSocket() client: Socket): void {
    if (!this.guardMessageRate(client)) {
      return;
    }
    const user = (client.data as any).user as AuthUser | undefined;
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      client.emit('events:error', { message: 'Acesso negado ao dashboard' });
      return;
    }
    client.join('events:dashboard:admin');
    client.emit('dashboard:subscribed', { ok: true });
  }

  @SubscribeMessage('events:heartbeat:ack')
  handleHeartbeatAck(@ConnectedSocket() client: Socket): void {
    this.heartbeatByClient.set(client.id, Date.now());
  }

  private validateClientToken(socket: Socket): AuthUser {
    const authToken = (socket.handshake.auth?.token as string | undefined) ?? '';
    const headerToken = (socket.handshake.headers.authorization as string | undefined) ?? '';

    const rawToken = authToken || headerToken;
    const token = rawToken.startsWith('Bearer ')
      ? rawToken.slice('Bearer '.length)
      : rawToken;

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    const secret = this.configService.get<string>('jwt.secret');
    if (!secret) {
      throw new UnauthorizedException('Segredo JWT não configurado');
    }

    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    const userId = (decoded.sub as string | undefined) ?? '';
    const role = (decoded.role as string | undefined) ?? 'CUSTOMER';
    if (!userId) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      id: userId,
      role,
      email: decoded.email as string | undefined,
    };
  }

  private guardMessageRate(client: Socket): boolean {
    const now = Date.now();
    const current = this.rateLimitByClient.get(client.id);
    const windowMs = 10_000;
    const maxMessages = 30;

    if (!current || now - current.startedAt > windowMs) {
      this.rateLimitByClient.set(client.id, { startedAt: now, count: 1 });
      this.heartbeatByClient.set(client.id, now);
      return true;
    }

    if (current.count >= maxMessages) {
      client.emit('events:rate_limited', {
        message: 'Limite de mensagens atingido. Tente novamente em instantes.',
      });
      return false;
    }

    current.count += 1;
    this.rateLimitByClient.set(client.id, current);
    this.heartbeatByClient.set(client.id, now);
    return true;
  }

  private startHeartbeatLoop(): void {
    if (this.heartbeatInterval) {
      return;
    }
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [clientId, client] of this.connectedClients.entries()) {
        const lastSeen = this.heartbeatByClient.get(clientId) ?? 0;
        if (now - lastSeen > 90_000) {
          client.disconnect(true);
          this.handleDisconnection(client);
          continue;
        }
        client.emit('events:heartbeat', { ts: now });
      }
    }, 30_000);
  }
}
