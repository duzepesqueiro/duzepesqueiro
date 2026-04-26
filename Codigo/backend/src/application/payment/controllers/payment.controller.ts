import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
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

  @Post('webhook/mercadopago')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processa notificações de pagamento do Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  async handleMercadoPagoWebhook(
    @Body() dto: MercadoPagoWebhookDto,
  ): Promise<{ received: true }> {
    await this.paymentService.processMercadoPagoWebhook(dto);
    return { received: true };
  }
}
