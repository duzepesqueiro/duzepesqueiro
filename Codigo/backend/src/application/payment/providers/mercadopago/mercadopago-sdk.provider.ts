import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig } from 'mercadopago';

export const MERCADO_PAGO_SDK_CLIENT = Symbol('MERCADO_PAGO_SDK_CLIENT');

export const mercadoPagoSdkProvider: Provider = {
  provide: MERCADO_PAGO_SDK_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const accessToken = configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is required');
    }

    return new MercadoPagoConfig({ accessToken });
  },
};
