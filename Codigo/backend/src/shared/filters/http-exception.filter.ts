import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
  };
  timestamp: string;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      | string
      | {
          message?: string | string[];
          error?: string;
          code?: string;
          details?: unknown;
        };

    const body: ErrorBody = {
      success: false,
      error: {
        code:
          typeof exceptionResponse === 'string'
            ? `HTTP_${status}`
            : exceptionResponse.code ?? `HTTP_${status}`,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : exceptionResponse.message ?? exception.message,
        details:
          typeof exceptionResponse === 'string'
            ? { path: request.url }
            : exceptionResponse.details,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
