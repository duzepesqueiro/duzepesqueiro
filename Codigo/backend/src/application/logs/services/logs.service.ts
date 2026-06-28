import { Injectable, Logger } from '@nestjs/common';
import { LogContext, LogEntry, LogLevel } from '../interfaces/log-entry.interface';
import { LogsMongoRepository } from './logs-mongo.repository';
import { requestContext } from '../../../shared/common/request-context';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly repository: LogsMongoRepository) {}

  async info(
    context: LogContext,
    event: string,
    payload?: Record<string, unknown>,
    aggregateId?: string,
    meta?: LogEntry['meta'],
  ): Promise<void> {
    await this.write('INFO', context, event, payload, aggregateId, meta);
  }

  async warn(
    context: LogContext,
    event: string,
    payload?: Record<string, unknown>,
    aggregateId?: string,
    meta?: LogEntry['meta'],
  ): Promise<void> {
    await this.write('WARN', context, event, payload, aggregateId, meta);
  }

  async error(
    context: LogContext,
    event: string,
    payload?: Record<string, unknown>,
    aggregateId?: string,
    meta?: LogEntry['meta'],
  ): Promise<void> {
    await this.write('ERROR', context, event, payload, aggregateId, meta);
  }

  private async write(
    level: LogLevel,
    context: LogContext,
    event: string,
    payload?: Record<string, unknown>,
    aggregateId?: string,
    meta?: LogEntry['meta'],
  ): Promise<void> {
    const store = requestContext.getStore();
    const mergedMeta =
      store?.requestId && !meta?.requestId
        ? { ...(meta ?? {}), requestId: store.requestId }
        : meta;

    const entry: LogEntry = {
      context,
      event,
      aggregateId,
      payload,
      level,
      timestamp: new Date().toISOString(),
      meta: mergedMeta,
    };

    try {
      await this.repository.save(entry);
    } catch (error) {
      this.logger.error(
        `Falha ao persistir log context=${context} event=${event}`,
        error as Error,
      );
    }
  }
}
