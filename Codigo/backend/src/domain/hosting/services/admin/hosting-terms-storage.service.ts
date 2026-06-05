import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface HostingUploadedTermsDocument {
  fileUrl: string;
  fileKey: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface HostingDownloadedTermsDocument {
  content: Buffer;
  mimeType: string;
}

@Injectable()
export class HostingTermsStorageService {
  private readonly logger = new Logger(HostingTermsStorageService.name);
  private readonly bucket = 'hosting-terms-documents';
  private readonly maxFileSizeBytes = 10 * 1024 * 1024;
  private readonly allowedMimeTypes = new Set(['application/pdf']);

  constructor(private readonly configService: ConfigService) {}

  async uploadSingle(file: Express.Multer.File): Promise<HostingUploadedTermsDocument> {
    if (!file) {
      throw new BadRequestException('Arquivo PDF é obrigatório.');
    }

    this.validateFile(file);

    const client = this.createSupabaseClient();
    await this.ensureBucket(client);

    const extension = this.extractExtension(file.originalname);
    const fileKey = `terms/${new Date().getFullYear()}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage.from(this.bucket).upload(fileKey, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (uploadError) {
      this.logger.error(`Upload do termo falhou (${uploadError.message}).`);
      throw new InternalServerErrorException(`Falha no upload do termo: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(this.bucket).getPublicUrl(fileKey);

    if (!publicUrl) {
      throw new InternalServerErrorException('Não foi possível gerar URL pública do termo.');
    }

    return {
      fileUrl: publicUrl,
      fileKey,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
    };
  }

  async downloadFromPublicUrl(url: string): Promise<HostingDownloadedTermsDocument> {
    if (!url?.trim()) {
      throw new BadRequestException('Documento de termos não configurado.');
    }

    const fileKey = this.extractFileKeyFromPublicUrl(url);
    if (!fileKey) {
      throw new BadRequestException('Não foi possível identificar o arquivo de termos.');
    }

    const client = this.createSupabaseClient();
    const { data, error } = await client.storage.from(this.bucket).download(fileKey);
    if (error || !data) {
      throw new InternalServerErrorException(
        `Falha ao baixar o arquivo de termos: ${error?.message ?? 'arquivo indisponível'}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return {
      content: Buffer.from(arrayBuffer),
      mimeType: data.type || 'application/pdf',
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido. Envie apenas PDF.');
    }

    const extension = this.extractExtension(file.originalname);
    if (extension !== 'pdf') {
      throw new BadRequestException('Formato inválido. O arquivo deve ter extensão .pdf.');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('Arquivo excede o limite de 10MB.');
    }
  }

  private createSupabaseClient() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    const directUrl = this.configService.get<string>('DIRECT_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!databaseUrl && !directUrl) {
      throw new InternalServerErrorException('Variáveis DATABASE_URL/DIRECT_URL não configuradas.');
    }

    const parsed = this.parseSupabaseFromDatabaseUrl(directUrl || databaseUrl || '');
    if (!parsed?.url) {
      throw new InternalServerErrorException('Não foi possível derivar URL do projeto Supabase a partir do .env.');
    }

    if (!supabaseServiceKey) {
      throw new InternalServerErrorException(
        'SUPABASE_SERVICE_ROLE_KEY não configurada. As URLs do banco (DATABASE_URL/DIRECT_URL) não autenticam no Storage.',
      );
    }

    return createClient(parsed.url, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async ensureBucket(client: any): Promise<void> {
    const { data: currentBucket, error: bucketCheckError } = await client.storage.getBucket(this.bucket);
    if (bucketCheckError || !currentBucket) {
      const { error: createBucketError } = await client.storage.createBucket(this.bucket, { public: true });
      if (createBucketError) {
        throw new InternalServerErrorException(
          `Bucket '${this.bucket}' inexistente e não foi possível criar automaticamente: ${createBucketError.message}`,
        );
      }
    }
  }

  private extractExtension(fileName: string): string {
    const byName = fileName?.split('.').pop()?.toLowerCase();
    return byName || 'pdf';
  }

  private extractFileKeyFromPublicUrl(url: string): string | null {
    const marker = `/storage/v1/object/public/${this.bucket}/`;
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }
    const keyWithQuery = url.slice(markerIndex + marker.length);
    const key = keyWithQuery.split('?')[0];
    return key || null;
  }

  private parseSupabaseFromDatabaseUrl(rawUrl: string): { url: string } | null {
    try {
      const parsed = new URL(rawUrl);
      const user = decodeURIComponent(parsed.username || '');
      const password = decodeURIComponent(parsed.password || '');
      const refMatch = user.match(/^postgres\.([a-z0-9]+)/i);
      if (!refMatch?.[1] || !password) {
        return null;
      }
      const projectRef = refMatch[1];
      return {
        url: `https://${projectRef}.supabase.co`,
      };
    } catch {
      return null;
    }
  }
}
