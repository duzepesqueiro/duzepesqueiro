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

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mongoUrl = this.configService.get<string>('database.mongodb.url');
    if (!mongoUrl) {
      this.logger.warn('MONGODB_URL não configurada. Persistência de logs desabilitada.');
      return;
    }

    try {
      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db();
      this.enabled = true;
      await this.ensureIndexes();
      this.logger.log('MongoDB de logs conectado com sucesso.');
    } catch (error) {
      this.enabled = false;
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
      payload: this.sanitize(entry.payload),
      meta: this.sanitize(entry.meta),
    });
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

  private sanitize(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value));
  }
}
