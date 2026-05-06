import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Public } from '../../../../application/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { FilterEventsDto } from '../../dto/user';
import {
  EventCardResponseDto,
  PaginatedEventCardResponseDto,
  RegistrationStatusResponseDto,
} from '../../dto/docs';
import { IEventCard, IPaginatedResult } from '../../interfaces';
import { EventRegistrationService, EventUserService } from '../../services/user';

type StatusParam = 'ALL' | 'UPCOMING' | 'CANCELLED';

@Controller('events')
@ApiTags('Events - User')
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventUserController {
  constructor(
    private readonly eventUserService: EventUserService,
    private readonly eventRegistrationService: EventRegistrationService,
  ) {}

  @Get()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar eventos públicos paginados' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de cards de eventos',
    type: PaginatedEventCardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros de filtro inválidos' })
  async getEvents(
    @Query() filters: FilterEventsDto,
  ): Promise<IPaginatedResult<IEventCard>> {
    return this.eventUserService.getEvents(filters);
  }

  @Get(':id')
  @Public()
  @Throttle({ default: { limit: 80, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obter detalhes de um evento' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Card do evento', type: EventCardResponseDto })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async getEventById(@Param('id', ParseUUIDPipe) id: string): Promise<IEventCard> {
    return this.eventUserService.getEventById(id);
  }

  @Get('status/:status')
  @Public()
  @Throttle({ default: { limit: 80, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar eventos por status público' })
  @ApiParam({ name: 'status', enum: ['ALL', 'UPCOMING', 'CANCELLED'] })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos por status',
    type: EventCardResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'Status inválido' })
  async getEventsByStatus(
    @Param(
      'status',
      new ParseEnumPipe({
        ALL: 'ALL',
        UPCOMING: 'UPCOMING',
        CANCELLED: 'CANCELLED',
      }),
    )
    status: StatusParam,
  ): Promise<IEventCard[]> {
    return this.eventUserService.getEventsByStatus(status);
  }

  @Get(':eventId/registration-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar status de inscrição do usuário no evento' })
  @ApiParam({ name: 'eventId', description: 'ID do evento', type: String })
  @ApiResponse({
    status: 200,
    description: 'Status de inscrição retornado com sucesso',
    type: RegistrationStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID do evento inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getRegistrationStatus(
    @CurrentUser('id') userId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<{ isRegistered: boolean; registration?: unknown }> {
    const registration = await this.eventRegistrationService.getRegistrationStatus(
      userId,
      eventId,
    );
    return registration
      ? {
          isRegistered: true,
          registration,
        }
      : {
          isRegistered: false,
        };
  }
}
