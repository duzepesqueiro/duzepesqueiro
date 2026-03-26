import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MercadoPagoWebhookDto } from '../dto';
import { PaymentExceptionFilter } from '../exceptions';
import { PaymentWebhookService } from '../services';

@Controller('payments/webhook')
@ApiTags('Payment Webhooks')
@UseFilters(PaymentExceptionFilter)
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post('mercadopago')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Webhook do Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  @HttpCode(200)
  async handleMercadoPagoWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() payload: MercadoPagoWebhookDto,
  ): Promise<void> {
    this.logger.log(
      `MercadoPago webhook requestId=${requestId} action=${payload.action}`,
    );
    await this.webhookService.processWebhook(signature, requestId, payload);
  }
}
