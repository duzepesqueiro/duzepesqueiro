import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService, registerAs } from '@nestjs/config';

export default registerAs('mercadopago', () => ({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
  clientId: process.env.MERCADOPAGO_CLIENT_ID,
  clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET,
}));

@Injectable()
export class MercadoPagoConfig implements OnModuleInit {
  private readonly logger = new Logger(MercadoPagoConfig.name);

  constructor(private readonly configService: ConfigService) {}

  get accessToken(): string {
    return this.configService.get<string>('mercadopago.accessToken', '');
  }

  get publicKey(): string {
    return this.configService.get<string>('mercadopago.publicKey', '');
  }

  get clientId(): string {
    return this.configService.get<string>('mercadopago.clientId', '');
  }

  get clientSecret(): string {
    return this.configService.get<string>('mercadopago.clientSecret', '');
  }

  onModuleInit() {
    if (!this.accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required');
    }
    if (!this.publicKey) {
      this.logger.warn('MERCADOPAGO_PUBLIC_KEY is not configured');
    }
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        'MERCADOPAGO_CLIENT_ID / MERCADOPAGO_CLIENT_SECRET not configured; OAuth refresh disabled',
      );
    }
    this.logger.log('Mercado Pago configuration validated');
  }
}
