import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from '../gateways/notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(private gateway: NotificationsGateway) {}

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
}
