import {
  Body,
  ClassSerializerInterceptor,
  Controller,
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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Public } from '../../../../application/auth/decorators/public.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  EventPaymentWebhookDto,
  InitiateEventPaymentDto,
  RefundEventPaymentDto,
} from '../../dto/user';
import {
  MessageResponseDto,
  PaymentIntentResponseDto,
  PaymentStatusResponseDto,
  WebhookAckResponseDto,
} from '../../dto/docs';
import { IPaymentIntent, IPaymentStatus } from '../../interfaces';
import { EventPaymentService } from '../../services/user';

@Controller(['events/payments', 'api/events/payments'])
@ApiTags('Events - Payments')
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventPaymentController {
  constructor(private readonly eventPaymentService: EventPaymentService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar pagamento de inscrição em evento' })
  @ApiResponse({
    status: 201,
    description: 'Intent de pagamento gerado com sucesso',
    type: PaymentIntentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou assinatura inconsistente' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Evento não encontrado' })
  @ApiResponse({ status: 409, description: 'Conflito de pagamento/inscrição' })
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateEventPaymentDto,
  ): Promise<IPaymentIntent> {
    return this.eventPaymentService.initiateEventPayment(userId, dto.eventId);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processar webhook de pagamento do gateway' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado com sucesso',
    type: WebhookAckResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Webhook inválido' })
  @ApiResponse({ status: 404, description: 'Pagamento ou inscrição não encontrados' })
  async handleWebhook(@Body() dto: EventPaymentWebhookDto): Promise<{ received: true }> {
    await this.eventPaymentService.handlePaymentWebhook(dto);
    return { received: true };
  }

  @Get(':registrationId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar status de pagamento de uma inscrição' })
  @ApiParam({ name: 'registrationId', description: 'ID da inscrição', type: String })
  @ApiResponse({
    status: 200,
    description: 'Status de pagamento retornado',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID inválido' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
  async getPaymentStatus(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<IPaymentStatus> {
    return this.eventPaymentService.getPaymentStatus(registrationId);
  }

  @Post(':registrationId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processar reembolso de inscrição paga' })
  @ApiParam({ name: 'registrationId', description: 'ID da inscrição', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reembolso processado com sucesso',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID inválido ou requisição inválida' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para reembolso' })
  @ApiResponse({ status: 404, description: 'Inscrição não encontrada' })
  @ApiResponse({ status: 409, description: 'Inscrição não apta para reembolso' })
  async refundPayment(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() dto: RefundEventPaymentDto,
  ): Promise<{ message: string }> {
    await this.eventPaymentService.refundEventPayment(registrationId, dto.reason);
    return { message: 'Reembolso processado com sucesso' };
  }
}
