import { Injectable } from '@nestjs/common';
import { NotificationStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

type ListNotificationsParams = {
  status?: 'ALL' | 'UNREAD';
  limit?: number;
  cursor?: string;
};

type CreateNotificationInput = {
  recipientUserId: string;
  source: string;
  eventKey: string;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  dedupKey?: string;
  payload?: Record<string, unknown>;
  expiresAt?: Date;
};

type NotifyUserInput = Omit<CreateNotificationInput, 'recipientUserId'> & {
  userId: string;
};

type NotifyAdminsInput = Omit<CreateNotificationInput, 'recipientUserId'>;

@Injectable()
export class NotificationsService {
  constructor(
    private gateway: NotificationsGateway,
    private prisma: PrismaService,
  ) {}

  sendToUser(userId: string, event: string, data: unknown) {
    this.gateway.sendToUser(userId, event, data);
  }

  sendToAdmins(event: string, data: unknown) {
    this.gateway.sendToAdmins(event, data);
  }

  broadcast(event: string, data: unknown) {
    this.gateway.broadcast(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.gateway.isUserOnline(userId);
  }

  async createNotification(input: CreateNotificationInput) {
    const dedupKey = this.buildDedupKey(input.dedupKey, input.recipientUserId);

    try {
      const created = await this.prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          source: input.source,
          eventKey: input.eventKey,
          title: input.title,
          message: input.message,
          type: input.type ?? 'INFO',
          dedupKey,
          payload: input.payload as Prisma.InputJsonValue | undefined,
          expiresAt: input.expiresAt,
        },
      });

      const normalized = this.normalizeNotification(created);
      this.gateway.sendToUser(input.recipientUserId, 'notification.created', normalized);
      return normalized;
    } catch (error) {
      if (
        dedupKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.notification.findUnique({
          where: { dedupKey },
        });
        if (existing) {
          return this.normalizeNotification(existing);
        }
      }
      throw error;
    }
  }

  async notifyUser(input: NotifyUserInput) {
    return this.createNotification({
      recipientUserId: input.userId,
      source: input.source,
      eventKey: input.eventKey,
      title: input.title,
      message: input.message,
      type: input.type,
      dedupKey: input.dedupKey,
      payload: input.payload,
      expiresAt: input.expiresAt,
    });
  }

  async notifyAdmins(input: NotifyAdminsInput) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE],
        },
        isActive: true,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      admins.map((admin) =>
        this.createNotification({
          recipientUserId: admin.id,
          source: input.source,
          eventKey: input.eventKey,
          title: input.title,
          message: input.message,
          type: input.type,
          dedupKey: input.dedupKey,
          payload: input.payload,
          expiresAt: input.expiresAt,
        }),
      ),
    );

    return {
      recipients: admins.length,
      delivered: results.filter((item) => item.status === 'fulfilled').length,
    };
  }

  async listForUser(userId: string, params: ListNotificationsParams = {}) {
    const limit = this.normalizeLimit(params.limit);
    const where = {
      recipientUserId: userId,
      ...(params.status === 'UNREAD' ? { status: NotificationStatus.UNREAD } : {}),
      ...(params.cursor ? { createdAt: { lt: new Date(params.cursor) } } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      }),
      this.prisma.notification.count({
        where: {
          recipientUserId: userId,
          status: NotificationStatus.UNREAD,
        },
      }),
    ]);

    return {
      items: items.map((item) => this.normalizeNotification(item)),
      unreadCount,
      nextCursor: items.length === limit ? items[items.length - 1].createdAt.toISOString() : null,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        recipientUserId: userId,
        status: NotificationStatus.UNREAD,
      },
    });
    return { count };
  }

  async markAsRead(userId: string, ids: string[]) {
    if (!ids.length) {
      return { updatedCount: 0 };
    }
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        recipientUserId: userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    this.gateway.sendToUser(userId, 'notification.read', { ids, readAt: now.toISOString() });
    return { updatedCount: result.count };
  }

  async markAllAsRead(userId: string) {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    this.gateway.sendToUser(userId, 'notification.read-all', { readAt: now.toISOString() });
    return { updatedCount: result.count };
  }

  private normalizeLimit(limit?: number): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 20;
    }
    return Math.min(Math.trunc(parsed), 100);
  }

  private buildDedupKey(dedupKey: string | undefined, recipientUserId: string): string | undefined {
    if (!dedupKey) {
      return undefined;
    }
    return `${dedupKey}:${recipientUserId}`;
  }

  private normalizeNotification(item: {
    id: string;
    type: string;
    title: string;
    message: string;
    payload: unknown;
    source: string;
    eventKey: string;
    status: NotificationStatus;
    createdAt: Date;
    readAt: Date | null;
  }) {
    return {
      id: item.id,
      type: item.type.toLowerCase(),
      title: item.title,
      message: item.message,
      payload: item.payload,
      source: item.source,
      eventKey: item.eventKey,
      category: item.source,
      timestamp: item.createdAt,
      isRead: item.status === NotificationStatus.READ,
      readAt: item.readAt,
    };
  }
}
