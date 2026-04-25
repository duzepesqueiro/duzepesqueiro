import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CheckoutPreferenceResponseDto,
  CreateCheckoutPreferenceDto,
} from '../dto';
import { PaymentService } from '../services/payment.service';

@ApiTags('Payments')
@Controller('payments')
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
}
