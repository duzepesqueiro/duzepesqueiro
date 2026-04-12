import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentException } from './payment.exceptions';

@Catch(PaymentException)
export class PaymentExceptionFilter implements ExceptionFilter {
  catch(exception: PaymentException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const exceptionResponse = exception.getResponse() as {
      message?: string;
      code?: string;
      details?: any;
    };

    response.status(exception.getStatus()).json({
      timestamp: new Date().toISOString(),
      path: request.url,
      code: exceptionResponse.code ?? exception.code,
      message: exceptionResponse.message ?? exception.message,
      details: exceptionResponse.details ?? exception.details,
    });
  }
}
