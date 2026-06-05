import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import {
  CreateEventDto,
  FilterEventsAdminDto,
  UpdateEventDto,
  UpdateEventStatusDto,
} from '../../dto/admin';
import {
  EventRegistrationResponseDto,
  EventResponseDto,
  MessageResponseDto,
  PaginatedEventResponseDto,
} from '../../dto/docs';
import { IEvent, IEventRegistration, IPaginatedResult } from '../../interfaces';
import { EventAdminService } from '../../services/admin';

@Controller('api/admin/events')
@ApiTags('Events - Admin')
@ApiExtraModels(CreateEventDto, UpdateEventDto)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventAdminController {
  constructor(
    private readonly eventAdminService: EventAdminService,
    private readonly logsService: LogsService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = /\/(jpg|jpeg|png|webp|gif)$/i.test(file.mimetype);
        callback(allowed ? null : new Error('Tipo de arquivo inválido'), allowed);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/CreateEventDto' },
        {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              maxItems: 10,
            },
          },
        },
      ],
    },
  })
  @ApiOperation({ summary: 'Criar evento administrativo' })
  @ApiResponse({ status: 201, description: 'Evento criado com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async createEvent(
    @CurrentUser('id') adminId: string,
    @Body() data: CreateEventDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<IEvent> {
    const result = await this.eventAdminService.createEvent(data, images ?? []);
    void this.logsService.info('events', 'AdminEventCreated', { adminId, eventId: result.id }, result.id);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Listar eventos com filtros administrativos' })
  @ApiResponse({
    status: 200,
    description: 'Eventos retornados com sucesso',
    type: PaginatedEventResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getAllEvents(
    @CurrentUser('id') adminId: string,
    @Query() filters: FilterEventsAdminDto,
  ): Promise<IPaginatedResult<IEvent>> {
    const result = await this.eventAdminService.getAllEvents(filters);
    void this.logsService.info('events', 'AdminEventsListed', { adminId, filters, total: result.total });
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter evento por ID (admin)' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Evento retornado com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async getEventById(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IEvent> {
    const result = await this.eventAdminService.getEventById(id);
    void this.logsService.info('events', 'AdminEventViewed', { adminId, eventId: id }, id);
    return result;
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = /\/(jpg|jpeg|png|webp|gif)$/i.test(file.mimetype);
        callback(allowed ? null : new Error('Tipo de arquivo inválido'), allowed);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/UpdateEventDto' },
        {
          type: 'object',
          properties: {
            images: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
              maxItems: 10,
            },
          },
        },
      ],
    },
  })
  @ApiOperation({ summary: 'Atualizar evento administrativo' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Evento atualizado com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async updateEvent(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateEventDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<IEvent> {
    const result = await this.eventAdminService.updateEvent(id, data, images ?? []);
    void this.logsService.info('events', 'AdminEventUpdated', { adminId, eventId: id }, id);
    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excluir evento (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Evento excluído com sucesso', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async deleteEvent(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.eventAdminService.deleteEvent(id);
    void this.logsService.warn('events', 'AdminEventDeleted', { adminId, eventId: id }, id);
    return { message: 'Evento excluído com sucesso' };
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restaurar evento excluído logicamente' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Evento restaurado com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async restoreEvent(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IEvent> {
    const result = await this.eventAdminService.restoreEvent(id);
    void this.logsService.info('events', 'AdminEventRestored', { adminId, eventId: id }, id);
    return result;
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Listar participantes do evento' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({
    status: 200,
    description: 'Participantes retornados com sucesso',
    type: EventRegistrationResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async getEventParticipants(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IEventRegistration[]> {
    const result = await this.eventAdminService.getEventParticipants(id);
    void this.logsService.info('events', 'AdminEventParticipantsViewed', { adminId, eventId: id, total: result.length }, id);
    return result;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do evento' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async updateEventStatus(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventStatusDto,
  ): Promise<IEvent> {
    const result = await this.eventAdminService.updateEventStatus(id, dto.status);
    void this.logsService.info(
      'events',
      'AdminEventStatusUpdated',
      { adminId, eventId: id, status: dto.status },
      id,
    );
    return result;
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
      required: ['images'],
    },
  })
  @ApiOperation({ summary: 'Upload de imagens do evento (até 10)' })
  @ApiParam({ name: 'id', description: 'ID do evento', type: String })
  @ApiResponse({ status: 200, description: 'Imagem atualizada com sucesso', type: EventResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  async uploadEventImages(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<IEvent> {
    const result = await this.eventAdminService.uploadEventImages(id, files ?? []);
    void this.logsService.info('events', 'AdminEventImageUpdated', { adminId, eventId: id }, id);
    return result;
  }
}
