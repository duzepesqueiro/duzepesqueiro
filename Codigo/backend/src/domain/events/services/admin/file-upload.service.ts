import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

type UploadResult = {
  url: string;
  key: string;
};

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly maxFilesPerEvent = 10;
  private readonly bucket = 'event-images';
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  constructor(private readonly configService: ConfigService) {}

  async uploadEventImage(file: Express.Multer.File): Promise<UploadResult> {
    this.validateFile(file);
    if (!file.buffer) {
      throw new BadRequestException('Arquivo sem buffer. Verifique a configuração do upload.');
    }
    const extension = this.extractExtension(file.originalname);
    const key = `events/${new Date().getFullYear()}/${randomUUID()}.${extension}`;
    const client = this.createSupabaseClient();
    await this.ensureBucket(client);

    const { error: uploadError } = await client.storage.from(this.bucket).upload(key, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (uploadError) {
      this.logger.error(`Upload Supabase falhou (${uploadError.message}).`);
      throw new InternalServerErrorException(`Falha no upload da imagem: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(this.bucket).getPublicUrl(key);

    if (!publicUrl) {
      throw new InternalServerErrorException('Não foi possível gerar URL pública da imagem.');
    }

    this.logger.log(`Imagem de evento salva key=${key}`);
    return { url: publicUrl, key };
  }

  async uploadEventImages(files: Express.Multer.File[] = []): Promise<UploadResult[]> {
    if (files.length > this.maxFilesPerEvent) {
      throw new BadRequestException(
        `Quantidade máxima de imagens excedida. Envie no máximo ${this.maxFilesPerEvent} arquivos.`,
      );
    }
    return Promise.all(files.map((file) => this.uploadEventImage(file)));
  }

  async deleteFile(key?: string | null): Promise<void> {
    if (!key) return;
    const client = this.createSupabaseClient();
    await this.ensureBucket(client);
    const { error } = await client.storage.from(this.bucket).remove([key]);
    if (error) {
      this.logger.warn(`Falha ao remover imagem do bucket key=${key} (${error.message}).`);
    } else {
      this.logger.log(`Arquivo removido key=${key}`);
    }
  }

  private validateFile(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem não informado.');
    }
    if (!this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Use JPEG, PNG, WEBP ou GIF.',
      );
    }
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('Arquivo excede o limite de 5MB.');
    }
  }

  private extractExtension(originalName: string): string {
    const parts = originalName.split('.');
    if (parts.length < 2) {
      return 'jpg';
    }
    return parts[parts.length - 1].toLowerCase();
  }

  private createSupabaseClient() {
    const databaseUrlBucket =
      this.configService.get<string>('DATABASE_URL_BUCKET') ?? this.configService.get<string>('DATABASE_URL');
    const directUrlBucket =
      this.configService.get<string>('DIRECT_URL_BUCKET') ?? this.configService.get<string>('DIRECT_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!databaseUrlBucket && !directUrlBucket) {
      throw new InternalServerErrorException('Variáveis DATABASE_URL_BUCKET/DIRECT_URL_BUCKET não configuradas.');
    }

    const parsed = this.parseSupabaseFromDatabaseUrl(directUrlBucket || databaseUrlBucket || '');
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
