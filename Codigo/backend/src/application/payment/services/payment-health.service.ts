import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PaymentHealthResponseDto } from '../dto';
import { MercadoPagoTokenService } from '../providers/mercadopago';

@Injectable()
export class PaymentHealthService {
  private readonly logger = new Logger(PaymentHealthService.name);

  constructor(
    private readonly tokenService: MercadoPagoTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async checkHealth(): Promise<PaymentHealthResponseDto> {
    const correlationId = randomUUID();
    const database = await this.checkDatabase();
    const mercadoPago = await this.tokenService.validateToken();
    const status = database && mercadoPago ? 'ok' : 'degraded';
    const response: PaymentHealthResponseDto = {
      status,
      database,
      mercadoPago,
      correlationId,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify({ event: 'payment.health', ...response }));
    return response;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
