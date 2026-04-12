import { Module } from '@nestjs/common';
import { AuthModule } from '../../application/auth/auth.module';
import { NotificationsModule } from '../../application/notifications/notifications.module';
import { EstoqueWebSocketGateway } from '../../domain/inventory/gateways';

@Module({
  imports: [AuthModule, NotificationsModule],
  providers: [EstoqueWebSocketGateway],
  exports: [EstoqueWebSocketGateway, NotificationsModule],
})
export class WebsocketModule {}
