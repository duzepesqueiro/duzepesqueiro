export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export type LogContext =
  | 'auth'
  | 'mail'
  | 'payment'
  | 'security'
  | 'sales'
  | 'inventory'
  | 'rental'
  | 'events'
  | 'hosting'
  | 'application';

export interface LogEntry {
  context: LogContext;
  event: string;
  aggregateId?: string;
  payload?: Record<string, unknown>;
  level: LogLevel;
  timestamp: string;
  meta?: {
    source?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    requestId?: string;
    ip?: string;
    userId?: string;
    userAgent?: string;
  };
}
