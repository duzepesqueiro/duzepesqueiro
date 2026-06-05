import { Controller, Get, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MarkNotificationsReadDto } from '../dto/mark-notifications-read.dto';
import { NotificationsService } from '../services/notifications.service';

@Controller(['notifications', 'api/notifications'])
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações do usuário autenticado' })
  async list(
    @CurrentUser() user: { id: string },
    @Query('status') status?: 'ALL' | 'UNREAD',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.notificationsService.listForUser(user.id, {
      status: status === 'UNREAD' ? 'UNREAD' : 'ALL',
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Retorna quantidade de notificações não lidas' })
  async unreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch('read')
  @ApiOperation({ summary: 'Marca notificações específicas como lidas' })
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Body() payload: MarkNotificationsReadDto,
  ) {
    return this.notificationsService.markAsRead(user.id, payload.ids);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marca todas notificações como lidas' })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
