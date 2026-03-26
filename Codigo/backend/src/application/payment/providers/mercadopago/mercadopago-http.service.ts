import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { RETRY_CONFIG } from '../../constants';
import {
  PaymentAuthenticationException,
  PaymentGatewayException,
  PaymentRateLimitException,
  PaymentTimeoutException,
} from '../../exceptions';
import { MercadoPagoTokenService } from './mercadopago-token.service';

@Injectable()
export class MercadoPagoHttpService {
  private currentAccessToken = '';

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: MercadoPagoTokenService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async post<T>(endpoint: string, data: any, idempotencyKey?: string): Promise<T> {
    const safeIdempotencyKey = idempotencyKey ?? randomUUID();
    const headers = this.buildHeaders(safeIdempotencyKey);
    return this.makeRequest<T>({
      method: 'POST',
      url: endpoint,
      data,
      headers,
    });
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const headers = this.buildHeaders();
    return this.makeRequest<T>({
      method: 'GET',
      url: endpoint,
      params,
      headers,
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const headers = this.buildHeaders();
    return this.makeRequest<T>({
      method: 'PUT',
      url: endpoint,
      data,
      headers,
    });
  }

  private async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const correlationId = randomUUID();
    const timeoutMs = Number.parseInt(
      this.configService.get<string>('MERCADOPAGO_HTTP_TIMEOUT') ?? '15000',
      10,
    );
    const baseURL =
      this.configService.get<string>('MERCADOPAGO_BASE_URL') ??
      'https://api.mercadopago.com';

    const execute = async (): Promise<T> => {
      this.currentAccessToken = await this.tokenService.getAccessToken();
      const headers = {
        ...(config.headers ?? {}),
        ...this.buildHeaders(
          (config.headers as Record<string, string> | undefined)?.['X-Idempotency-Key'],
        ),
        'X-Correlation-Id': correlationId,
      };
      const requestConfig: AxiosRequestConfig = {
        ...config,
        baseURL,
        timeout: timeoutMs,
        headers,
      };

      this.logger.log(
        `[MP:${correlationId}] ${requestConfig.method} ${requestConfig.url} request`,
      );
      this.logger.debug(
        `[MP:${correlationId}] payload=${JSON.stringify(
          this.sanitizeForLogs(requestConfig.data),
        )} params=${JSON.stringify(this.sanitizeForLogs(requestConfig.params))}`,
      );

      const response = await firstValueFrom(this.httpService.request<T>(requestConfig));

      this.logger.log(
        `[MP:${correlationId}] ${requestConfig.method} ${requestConfig.url} response ${response.status}`,
      );
      this.logger.debug(
        `[MP:${correlationId}] responseData=${JSON.stringify(
          this.sanitizeForLogs(response.data),
        )}`,
      );

      return response.data;
    };

    let attempt = 0;
    while (true) {
      try {
        return await execute();
      } catch (error) {
        const axiosError = error as AxiosError;
        if (!this.shouldRetry(axiosError) || attempt >= RETRY_CONFIG.maxRetries - 1) {
          this.handleError(axiosError);
        }
        await this.retryWithBackoff(async () => undefined, attempt);
        attempt += 1;
      }
    }
  }

  private buildHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.currentAccessToken}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  private handleError(error: AxiosError): never {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, any> | undefined;
    const details = {
      code: error.code,
      status,
      data: this.sanitizeForLogs(data),
      message: error.message,
    };

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new PaymentTimeoutException(details);
    }

    if (status === 429) {
      throw new PaymentRateLimitException(details);
    }

    if (status === 401) {
      throw new PaymentAuthenticationException('Unauthorized by payment gateway', details);
    }

    if (status && status >= 400 && status < 500) {
      throw new PaymentGatewayException(
        data?.message || 'Payment gateway client error',
        'PAYMENT_GATEWAY_CLIENT_ERROR',
        details,
      );
    }

    throw new PaymentGatewayException(
      data?.message || 'Payment gateway communication error',
      'PAYMENT_GATEWAY_COMMUNICATION_ERROR',
      details,
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    const status = error.response?.status;
    if (status === 429) {
      return true;
    }
    if (!status && (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED')) {
      return true;
    }
    if (status && status >= 500) {
      return true;
    }
    return false;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt: number): Promise<T> {
    const delay = Math.min(
      RETRY_CONFIG.maxDelay,
      RETRY_CONFIG.initialDelay * RETRY_CONFIG.backoffMultiplier ** attempt,
    );
    this.logger.warn(`Retrying Mercado Pago request in ${delay}ms (attempt ${attempt + 2})`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fn();
  }

  private sanitizeForLogs(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeForLogs(item));
    }
    if (typeof value !== 'object') {
      return value;
    }

    const sensitiveKeys = [
      'authorization',
      'access_token',
      'token',
      'card_number',
      'number',
      'security_code',
      'cvv',
      'client_secret',
    ];

    const sanitized: Record<string, any> = {};
    for (const [key, raw] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = this.sanitizeForLogs(raw);
      }
    }
    return sanitized;
  }
}
