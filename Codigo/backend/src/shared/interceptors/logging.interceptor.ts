import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LogsService } from '../../application/logs/services';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, ip } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startedAt;
        const statusCode = response.statusCode;
        this.logger.log(`${method} ${originalUrl} ${statusCode} - ${duration}ms`);
        void this.logsService.info(
          'security',
          'HttpRequestCompleted',
          { durationMs: duration },
          undefined,
          {
            method,
            path: originalUrl,
            statusCode,
            ip,
            userAgent: request.headers['user-agent'],
            userId: request.user?.id,
          },
        );
      }),
      catchError((error: unknown) => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startedAt;
        const statusCode = response?.statusCode ?? 500;
        void this.logsService.error(
          'security',
          'HttpRequestFailed',
          {
            durationMs: duration,
            error: error instanceof Error ? error.message : 'unknown',
          },
          undefined,
          {
            method,
            path: originalUrl,
            statusCode,
            ip,
            userAgent: request.headers['user-agent'],
            userId: request.user?.id,
          },
        );
        return throwError(() => error);
      }),
    );
  }
}
