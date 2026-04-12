import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PaymentHealthResponseDto } from '../dto';
import { PaymentHealthService } from '../services';

@Controller('payments')
@ApiTags('Payments')
export class PaymentHealthController {
  constructor(private readonly paymentHealthService: PaymentHealthService) {}

  @Get('health')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check do módulo de payment' })
  @ApiResponse({
    status: 200,
    description: 'Status de conectividade do banco e Mercado Pago',
    type: PaymentHealthResponseDto,
  })
  async health(): Promise<PaymentHealthResponseDto> {
    return this.paymentHealthService.checkHealth();
  }
}
