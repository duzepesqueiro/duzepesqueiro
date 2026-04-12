import { HttpException, HttpStatus } from '@nestjs/common';
import { IPaymentDomain, IPaymentMethod } from '../interfaces';

export class PaymentException extends HttpException {
  code: string;
  details?: any;

  constructor(
    message: string,
    httpStatus: HttpStatus,
    code: string,
    details?: any,
  ) {
    super(
      {
        statusCode: httpStatus,
        message,
        code,
        details,
      },
      httpStatus,
    );
    this.code = code;
    this.details = details;
  }
}

export class PaymentValidationException extends PaymentException {
  constructor(message: string, code: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, code, details);
  }
}

export class PaymentMethodNotAllowedException extends PaymentValidationException {
  constructor(domain: IPaymentDomain, method: IPaymentMethod | string) {
    super(
      `Payment method "${method}" is not allowed for domain "${domain}"`,
      'PAYMENT_METHOD_NOT_ALLOWED',
      { domain, method },
    );
  }
}

export class InstallmentNotAllowedException extends PaymentValidationException {
  constructor(domain: IPaymentDomain, installments: number) {
    super(
      `Installments are not allowed for domain "${domain}"`,
      'INSTALLMENT_NOT_ALLOWED',
      { domain, installments },
    );
  }
}

export class MinInstallmentValueException extends PaymentValidationException {
  constructor(minValue: number, actualValue: number) {
    super(
      'Installment value is below minimum allowed',
      'MIN_INSTALLMENT_VALUE_NOT_REACHED',
      { minValue, actualValue },
    );
  }
}

export class MinValueForInstallmentsException extends PaymentValidationException {
  constructor(minValueForInstallments: number, transactionAmount: number) {
    super(
      'Transaction amount is below minimum value for installments',
      'MIN_VALUE_FOR_INSTALLMENTS_NOT_REACHED',
      { minValueForInstallments, transactionAmount },
    );
  }
}

export class PaymentGatewayException extends PaymentException {
  constructor(
    message: string,
    code = 'PAYMENT_GATEWAY_ERROR',
    details?: any,
    httpStatus: HttpStatus = HttpStatus.BAD_GATEWAY,
  ) {
    super(message, httpStatus, code, details);
  }
}

export class PaymentTimeoutException extends PaymentGatewayException {
  constructor(details?: any) {
    super(
      'Payment gateway timeout',
      'PAYMENT_GATEWAY_TIMEOUT',
      details,
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}

export class PaymentRateLimitException extends PaymentGatewayException {
  constructor(details?: any) {
    super(
      'Payment gateway rate limit reached',
      'PAYMENT_GATEWAY_RATE_LIMIT',
      details,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class PaymentAuthenticationException extends PaymentException {
  constructor(message = 'Payment authentication failed', details?: any) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'PAYMENT_AUTHENTICATION_ERROR',
      details,
    );
  }
}

export class PaymentNotFoundException extends PaymentException {
  constructor(paymentId?: string | number, details?: any) {
    super(
      paymentId ? `Payment "${paymentId}" was not found` : 'Payment not found',
      HttpStatus.NOT_FOUND,
      'PAYMENT_NOT_FOUND',
      { paymentId, ...details },
    );
  }
}

export class PaymentStateException extends PaymentException {
  constructor(message = 'Payment state conflict', details?: any) {
    super(message, HttpStatus.CONFLICT, 'PAYMENT_STATE_CONFLICT', details);
  }
}
