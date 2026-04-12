import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MERCADOPAGO_API,
  PAYMENT_ERROR_CODES,
  RETRY_CONFIG,
} from '../../constants';
import {
  PaymentAuthenticationException,
  PaymentGatewayException,
  PaymentRateLimitException,
  PaymentTimeoutException,
} from '../../exceptions';

type OAuthTokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

@Injectable()
export class MercadoPagoTokenService {
  private accessToken: string;
  private tokenExpiration: Date;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.accessToken = this.configService.get<string>(
      'mercadopago.accessToken',
      '',
    );
    const defaultExpirationMs = 180 * 24 * 60 * 60 * 1000;
    this.tokenExpiration = new Date(Date.now() + defaultExpirationMs);
  }

  async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      this.logger.log('Refreshing Mercado Pago access token');
      await this.refreshToken();
      return this.accessToken;
    }

    if (this.isTokenExpired()) {
      const hasOAuthCredentials = Boolean(
        this.configService.get<string>('mercadopago.clientId') ||
          process.env.MERCADOPAGO_CLIENT_ID,
      ) &&
        Boolean(
          this.configService.get<string>('mercadopago.clientSecret') ||
            process.env.MERCADOPAGO_CLIENT_SECRET,
        );

      if (!hasOAuthCredentials) {
        this.logger.warn(
          'Mercado Pago token marked as expired, but OAuth client credentials are not configured. Reusing static access token.',
        );
        return this.accessToken;
      }

      this.logger.log('Refreshing Mercado Pago access token');
      await this.refreshToken();
    }
    return this.accessToken;
  }

  async refreshToken(): Promise<void> {
    const clientId =
      this.configService.get<string>('mercadopago.clientId') ||
      process.env.MERCADOPAGO_CLIENT_ID;
    const clientSecret =
      this.configService.get<string>('mercadopago.clientSecret') ||
      process.env.MERCADOPAGO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      if (this.accessToken) {
        this.logger.warn(
          'Mercado Pago OAuth credentials missing. Keeping static access token.',
        );
        return;
      }
      throw new PaymentAuthenticationException('Mercado Pago credentials are missing');
    }

    await this.executeWithRetry(async () => {
      try {
        const url = `${MERCADOPAGO_API.BASE_URL}${MERCADOPAGO_API.OAUTH_TOKEN}`;
        const payload = {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        };

        this.logger.log('Requesting new Mercado Pago OAuth token');
        const { data } = await firstValueFrom(
          this.httpService.post<OAuthTokenResponse>(url, payload, {
            timeout: 10000,
          }),
        );

        if (!data?.access_token) {
          throw new PaymentGatewayException(
            'Mercado Pago did not return access token',
            'MERCADOPAGO_INVALID_TOKEN_RESPONSE',
            data,
          );
        }

        const expiresInSeconds = data.expires_in ?? 180 * 24 * 60 * 60;
        this.accessToken = data.access_token;
        this.tokenExpiration = new Date(
          Date.now() + expiresInSeconds * 1000,
        );
        this.logger.log('Mercado Pago OAuth token refreshed successfully');
      } catch (error: any) {
        const gatewayErrorCode = error?.response?.data?.error as string | undefined;
        const message =
          PAYMENT_ERROR_CODES[gatewayErrorCode as keyof typeof PAYMENT_ERROR_CODES] ||
          error?.response?.data?.message ||
          error?.message ||
          'Mercado Pago token refresh failed';
        const status = error?.response?.status as number | undefined;

        if (status === 429 || gatewayErrorCode === 'local_rate_limited') {
          throw new PaymentRateLimitException({ gatewayErrorCode, message });
        }
        if (
          gatewayErrorCode === 'invalid_client' ||
          gatewayErrorCode === 'invalid_grant' ||
          gatewayErrorCode === 'unauthorized_client'
        ) {
          throw new PaymentAuthenticationException(message, { gatewayErrorCode });
        }
        if (error?.code === 'ECONNABORTED') {
          throw new PaymentTimeoutException({ gatewayErrorCode, message });
        }

        throw new PaymentGatewayException(
          'Failed to refresh Mercado Pago token',
          'MERCADOPAGO_TOKEN_REFRESH_FAILED',
          { gatewayErrorCode, message },
        );
      }
    });
  }

  private isTokenExpired(): boolean {
    const fiveMinutesMs = 5 * 60 * 1000;
    return !this.tokenExpiration || Date.now() >= this.tokenExpiration.getTime() - fiveMinutesMs;
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const url = `${MERCADOPAGO_API.BASE_URL}${MERCADOPAGO_API.PAYMENTS_SEARCH}`;
      await firstValueFrom(
        this.httpService.get(url, {
          params: { limit: 1, offset: 0 },
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      this.logger.log('Mercado Pago token validation succeeded');
      return true;
    } catch (error) {
      this.logger.error('Mercado Pago token validation failed', error);
      return false;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delay: number = RETRY_CONFIG.initialDelay;
    let lastError: unknown;

    while (attempt < RETRY_CONFIG.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= RETRY_CONFIG.maxRetries) {
          break;
        }

        this.logger.warn(
          `Mercado Pago operation failed on attempt ${attempt}. Retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(
          RETRY_CONFIG.maxDelay,
          Math.floor(delay * RETRY_CONFIG.backoffMultiplier),
        );
      }
    }

    throw lastError;
  }
}
