import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CheckoutReturnDto,
  CheckoutPreferenceResponseDto,
  CreateCheckoutPreferenceDto,
  MercadoPagoWebhookDto,
} from '../dto';
import { PaymentService } from '../services/payment.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout-pro/preference')
  @ApiOperation({ summary: 'Cria preferência de pagamento no Checkout Pro' })
  @ApiResponse({
    status: 201,
    description: 'Preferência criada com sucesso',
    type: CheckoutPreferenceResponseDto,
  })
  async createCheckoutPreference(
    @Body() dto: CreateCheckoutPreferenceDto,
  ): Promise<CheckoutPreferenceResponseDto> {
    return this.paymentService.createCheckoutPreference(dto);
  }

  @Post('checkout-pro/return')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Persiste dados de retorno do Checkout Pro' })
  @ApiResponse({ status: 200, description: 'Dados de retorno processados com sucesso' })
  async processCheckoutReturn(
    @Body() dto: CheckoutReturnDto,
  ): Promise<{ received: true }> {
    await this.paymentService.processCheckoutReturn(dto);
    return { received: true };
  }

  @Post('webhook/mercadopago')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processa notificações de pagamento do Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  async handleMercadoPagoWebhook(
    @Body() body: Record<string, any>,
    @Query('type') queryType?: string,
    @Query('data.id') queryDataId?: string,
  ): Promise<{ received: true }> {
    const dto: MercadoPagoWebhookDto = {
      type: String(queryType ?? body?.type ?? ''),
      action: typeof body?.action === 'string' ? body.action : undefined,
      dateCreated:
        typeof body?.dateCreated === 'string'
          ? body.dateCreated
          : typeof body?.date_created === 'string'
            ? body.date_created
            : undefined,
      data: {
        id: String(queryDataId ?? body?.data?.id ?? body?.id ?? ''),
      },
    };
    await this.paymentService.processMercadoPagoWebhook(dto);
    return { received: true };
  }
}
