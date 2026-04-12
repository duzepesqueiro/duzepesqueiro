import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, throwError } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import { LogsService } from '../../../application/logs/services';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip, headers } = request;

    if (method === 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        const entityId = this.extractEntityId(url) ?? 'unknown';
        const author = {
          userId: user?.id ?? 'anonymous',
          name: user?.name ?? user?.username ?? 'Anonymous',
          email: user?.email ?? 'anonymous@local',
        };
        await this.logsService.info(
          'inventory',
          'HttpMutationSuccess',
          {
            action: this.mapMethodToAction(method),
            entity: this.extractEntity(url),
            entityId,
            author,
            changes: { request: body, response },
            description: `${method} ${url}`,
          },
          entityId,
          {
            source: 'shared.audit.interceptor',
            path: url,
            method,
            ip,
            userAgent: headers['user-agent'],
            userId: author.userId,
          },
        );
      }),
      catchError((error) =>
        from(
          (() => {
            const entityId = this.extractEntityId(url) ?? 'unknown';
            const author = {
              userId: user?.id ?? 'anonymous',
              name: user?.name ?? user?.username ?? 'Anonymous',
              email: user?.email ?? 'anonymous@local',
            };
            return this.logsService.error(
              'inventory',
              'HttpMutationError',
              {
                action: this.mapMethodToAction(method),
                entity: this.extractEntity(url),
                entityId,
                author,
                changes: { request: body, error: error?.message ?? 'Unknown error' },
                description: `ERROR ${method} ${url} - ${error?.status ?? 500}`,
              },
              entityId,
              {
                source: 'shared.audit.interceptor',
                path: url,
                method,
                statusCode: error?.status,
                ip,
                userAgent: headers['user-agent'],
                userId: author.userId,
              },
            );
          })(),
        ).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private mapMethodToAction(method: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    const map: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] ?? 'UPDATE';
  }

  private extractEntity(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[0] ?? 'unknown';
  }

  private extractEntityId(url: string): string | undefined {
    const parts = url.split('/').filter(Boolean);
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return parts.find((part) => uuidPattern.test(part));
  }
}
