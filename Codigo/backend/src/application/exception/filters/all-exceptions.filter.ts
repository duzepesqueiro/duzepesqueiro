import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ExceptionResponse } from '../interfaces/exception-response.interface';
import { LogsService } from '../../logs/services';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly logsService: LogsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    const errorResponse: ExceptionResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    };

    const level = status >= 500 ? 'error' : 'warn';
    const event = status === HttpStatus.TOO_MANY_REQUESTS
      ? 'AttackAttemptDetected'
      : 'HttpExceptionCaptured';
    const payload = {
      message: errorResponse.message,
      error: errorResponse.error,
      details: errorResponse.details,
    };
    const meta = {
      method: request.method,
      path: request.url,
      statusCode: status,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id,
    };

    if (level === 'error') {
      void this.logsService.error('security', event, payload, undefined, meta);
    } else {
      void this.logsService.warn('security', event, payload, undefined, meta);
    }

    response.status(status).json(errorResponse);
  }
}
