import { Module } from '@nestjs/common';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { NotificationsService } from './services/notifications.service';

@Module({
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
