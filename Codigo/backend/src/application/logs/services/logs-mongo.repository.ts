import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, MongoClient } from 'mongodb';
import { LogContext, LogEntry } from '../interfaces/log-entry.interface';

@Injectable()
export class LogsMongoRepository implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogsMongoRepository.name);
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private enabled = false;
  private lastInitError: string | null = null;
  private urlConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mongoUrl = this.configService.get<string>('database.mongodb.url');
    if (!mongoUrl) {
      this.urlConfigured = false;
      this.lastInitError = 'MONGODB_URL não configurada.';
      this.logger.warn('MONGODB_URL não configurada. Persistência de logs desabilitada.');
      return;
    }
    this.urlConfigured = true;

    try {
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db();
      this.enabled = true;
      this.lastInitError = null;
      await this.ensureIndexes();
      this.logger.log('MongoDB de logs conectado com sucesso.');
    } catch (error) {
      this.enabled = false;
      this.lastInitError = this.sanitizeErrorMessage((error as Error)?.message);
      this.logger.error('Falha ao conectar MongoDB de logs', error as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  async save(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.db) {
      return;
    }

    const collection = this.getCollection(entry.context);
    await collection.insertOne({
      ...entry,
      payload: this.sanitizeAndRedact(entry.payload),
      meta: this.sanitizeAndRedact(entry.meta),
    });
  }

  async listCollections(prefix = 'logs_'): Promise<string[]> {
    if (!this.enabled || !this.db) {
      return [];
    }

    const collections = await this.db.listCollections({}, { nameOnly: true }).toArray();
    return collections
      .map((c) => c?.name)
      .filter((name): name is string => typeof name === 'string' && name.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b));
  }

  async fetchAllDocuments(collectionName: string): Promise<any[]> {
    if (!this.enabled || !this.db) {
      return [];
    }

    const collection = this.db.collection(collectionName);
    return collection.find({}).sort({ timestamp: -1, _id: -1 }).toArray();
  }

  getStatus(): { enabled: boolean; urlConfigured: boolean; lastError: string | null } {
    return { enabled: this.enabled && Boolean(this.db), urlConfigured: this.urlConfigured, lastError: this.lastInitError };
  }

  private getCollection(context: LogContext): Collection {
    if (!this.db) {
      throw new Error('MongoDB logs repository is not initialized');
    }
    return this.db.collection(`logs_${context}`);
  }

  private async ensureIndexes(): Promise<void> {
    if (!this.db) {
      return;
    }

    const contexts: LogContext[] = [
      'auth',
      'mail',
      'payment',
      'security',
      'sales',
      'inventory',
      'rental',
      'events',
      'hosting',
      'application',
    ];

    await Promise.all(
      contexts.map(async (context) => {
        const collection = this.db!.collection(`logs_${context}`);
        await collection.createIndex({ timestamp: -1 });
        await collection.createIndex({ event: 1, timestamp: -1 });
        await collection.createIndex({ aggregateId: 1, timestamp: -1 });
        await collection.createIndex({ level: 1, timestamp: -1 });
      }),
    );
  }

  private sanitizeAndRedact(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }
    const sanitized = JSON.parse(JSON.stringify(value));
    return this.redactSensitive(sanitized);
  }

  private redactSensitive(value: unknown): unknown {
    const sensitiveKeys = new Set([
      'password',
      'senha',
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
      'set-cookie',
      'jwt',
      'jwt_secret',
      'jwtsecret',
      'mail_password',
      'mercadopago_access_token',
      'mercadopago_webhook_secret',
      'document',
      'cpf',
      'cnpj',
    ]);

    const visit = (current: any): any => {
      if (current === null || current === undefined) return current;
      if (Array.isArray(current)) return current.map(visit);
      if (typeof current !== 'object') return current;

      const out: Record<string, unknown> = {};
      for (const [rawKey, rawValue] of Object.entries(current)) {
        const key = rawKey.toLowerCase();
        if (sensitiveKeys.has(key)) {
          out[rawKey] = '[redacted]';
          continue;
        }
        out[rawKey] = visit(rawValue);
      }
      return out;
    };

    return visit(value as any);
  }

  private sanitizeErrorMessage(message?: string | null): string | null {
    if (!message) return null;
    return message.replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]');
  }
}
