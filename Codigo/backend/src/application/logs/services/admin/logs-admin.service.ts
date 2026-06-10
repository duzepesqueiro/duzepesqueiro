import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LogsMongoRepository } from '../logs-mongo.repository';

type ExportFormat = 'json' | 'csv';

@Injectable()
export class LogsAdminService {
  constructor(private readonly logsMongoRepository: LogsMongoRepository) {}

  async listCollections(): Promise<string[]> {
    const status = this.logsMongoRepository.getStatus();
    if (!status.urlConfigured) {
      throw new ServiceUnavailableException({
        code: 'LOGS_MONGODB_UNAVAILABLE',
        message: 'MongoDB de logs não está disponível.',
        reason: status.lastError ?? 'MONGODB_URL não configurada.',
      });
    }
    if (!status.enabled) {
      throw new ServiceUnavailableException({
        code: 'LOGS_MONGODB_UNAVAILABLE',
        message: 'MongoDB de logs não está disponível.',
        reason:
          status.lastError ??
          'Falha ao conectar no MongoDB. Verifique rede/DNS e whitelist de IP no cluster (Atlas).',
      });
    }

    const collections = await this.logsMongoRepository.listCollections('logs_');
    if (!collections.length) {
      throw new ServiceUnavailableException({
        code: 'LOGS_COLLECTIONS_EMPTY',
        message: 'Nenhuma coleção de logs foi encontrada.',
      });
    }
    return collections;
  }

  async exportCollection(input: { collection: string; format: ExportFormat }): Promise<{ content: string; contentType: string }> {
    const collection = String(input.collection || '').trim();
    const format = input.format;

    if (!/^logs_[a-z0-9_-]+$/i.test(collection)) {
      throw new BadRequestException('Coleção inválida.');
    }
    if (!['json', 'csv'].includes(format)) {
      throw new BadRequestException('Formato inválido.');
    }

    const collections = await this.listCollections();
    if (!collections.includes(collection)) {
      throw new BadRequestException('Coleção não encontrada.');
    }

    const docs = await this.logsMongoRepository.fetchAllDocuments(collection);
    if (format === 'json') {
      return { content: JSON.stringify(docs), contentType: 'application/json; charset=UTF-8' };
    }

    const rows = docs.map((d) => this.flattenDocument(d));
    const headers = this.buildHeaders(rows);
    const csv = '\ufeff' + this.toCsv(headers, rows);
    return { content: csv, contentType: 'text/csv; charset=UTF-8' };
  }

  private buildHeaders(rows: Array<Record<string, string>>): string[] {
    const set = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
    }

    const preferred = ['_id', 'timestamp', 'level', 'context', 'event', 'aggregateId'];
    const all = Array.from(set);
    const rest = all.filter((k) => !preferred.includes(k)).sort((a, b) => a.localeCompare(b));
    return preferred.filter((k) => set.has(k)).concat(rest);
  }

  private flattenDocument(input: any): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (value: any, prefix: string) => {
      if (value === null || value === undefined) {
        out[prefix] = '';
        return;
      }

      if (value instanceof Date) {
        out[prefix] = value.toISOString();
        return;
      }

      if (typeof value === 'object' && typeof value?.toHexString === 'function') {
        out[prefix] = value.toHexString();
        return;
      }

      if (Array.isArray(value)) {
        out[prefix] = JSON.stringify(value);
        return;
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (!entries.length) {
          out[prefix] = '{}';
          return;
        }
        for (const [k, v] of entries) {
          const nextKey = prefix ? `${prefix}.${k}` : k;
          walk(v, nextKey);
        }
        return;
      }

      out[prefix] = String(value);
    };

    if (input && typeof input === 'object') {
      for (const [k, v] of Object.entries(input)) {
        walk(v, k);
      }
      return out;
    }

    out['value'] = String(input);
    return out;
  }

  private toCsv(headers: string[], rows: Array<Record<string, string>>): string {
    const escape = (value: string) => {
      const s = value ?? '';
      const needsQuotes = /[",\r\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const lines: string[] = [];
    lines.push(headers.map(escape).join(','));

    for (const row of rows) {
      lines.push(headers.map((h) => escape(row?.[h] ?? '')).join(','));
    }

    return lines.join('\r\n');
  }
}
