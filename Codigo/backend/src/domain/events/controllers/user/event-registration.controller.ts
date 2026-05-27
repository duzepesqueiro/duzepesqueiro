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
  Post,
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
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RegisterEventDto } from '../../dto/user';
import {
  EventRegistrationResponseDto,
  MessageResponseDto,
  UserEventRegistrationResponseDto,
} from '../../dto/docs';
import { IEventRegistration, IUserEventRegistration } from '../../interfaces';
import { EventRegistrationService } from '../../services/user';

@Controller(['events/registrations', 'api/events/registrations'])
@ApiTags('Events - Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventRegistrationController {
  constructor(
    private readonly eventRegistrationService: EventRegistrationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar usuário autenticado em um evento' })
  @ApiResponse({
    status: 201,
    description: 'Inscrição criada com sucesso',
    type: EventRegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 409, description: 'Conflito de inscrição ou vagas' })
  async register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterEventDto,
  ): Promise<IEventRegistration> {
    return this.eventRegistrationService.registerForEvent(userId, dto.eventId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar inscrições do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Inscrições retornadas com sucesso',
    type: UserEventRegistrationResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getMyRegistrations(
    @CurrentUser('id') userId: string,
  ): Promise<IUserEventRegistration[]> {
    return this.eventRegistrationService.getUserRegistrations(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma inscrição do usuário' })
  @ApiParam({ name: 'id', description: 'ID da inscrição', type: String })
  @ApiResponse({
    status: 200,
    description: 'Inscrição retornada com sucesso',
    type: EventRegistrationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
  async getRegistrationById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IEventRegistration> {
    return this.eventRegistrationService.getRegistrationById(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar inscrição do usuário autenticado' })
  @ApiParam({ name: 'id', description: 'ID da inscrição', type: String })
  @ApiResponse({
    status: 200,
    description: 'Inscrição cancelada com sucesso',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
  async cancelRegistration(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.eventRegistrationService.cancelRegistration(userId, id);
    return { message: 'Inscrição cancelada com sucesso' };
  }
}
