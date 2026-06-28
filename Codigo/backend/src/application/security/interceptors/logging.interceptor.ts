import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogsService } from '../../logs/services';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = (request as any).requestId as string | undefined;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length');
        const duration = Date.now() - now;

        this.logger.log(
          `${method} ${url} ${statusCode} ${contentLength || '-'} - ${duration}ms - ${ip} - ${userAgent} - ${requestId ?? '-'}`,
        );
        void this.logsService.info(
          'security',
          'HttpRequestCompleted',
          {
            durationMs: duration,
            contentLength: contentLength ? Number(contentLength) : undefined,
          },
          undefined,
          {
            method,
            path: url,
            statusCode,
            ip,
            userAgent,
            userId: request.user?.id,
            requestId,
          },
        );
      }),
    );
  }
}
