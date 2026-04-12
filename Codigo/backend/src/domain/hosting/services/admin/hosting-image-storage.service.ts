import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export interface HostingUploadedImage {
  imageUrl: string;
  imageKey: string;
  fileSizeBytes: number;
  mimeType: string;
}

@Injectable()
export class HostingImageStorageService {
  private readonly logger = new Logger(HostingImageStorageService.name);
  private readonly bucket = 'hosting-chalet-images';
  private readonly maxImages = 10;
  private readonly maxFileSizeBytes = 10 * 1024 * 1024;
  private readonly allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  constructor(private readonly configService: ConfigService) {}

  async uploadMany(files: Express.Multer.File[]): Promise<HostingUploadedImage[]> {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    if (files.length > this.maxImages) {
      throw new BadRequestException('Máximo de 10 imagens por envio.');
    }

    const client = this.createSupabaseClient();
    await this.ensureBucket(client);

    const uploads: HostingUploadedImage[] = [];
    for (const file of files) {
      this.validateFile(file);
      uploads.push(await this.uploadSingle(client, file));
    }

    return uploads;
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file?.mimetype || !this.allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido. Envie JPG, PNG, WEBP ou GIF.');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('Arquivo excede o limite de 10MB.');
    }
  }

  private async uploadSingle(client: any, file: Express.Multer.File): Promise<HostingUploadedImage> {
    const extension = this.extractExtension(file.originalname, file.mimetype);
    const imageKey = `chalets/${new Date().getFullYear()}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage.from(this.bucket).upload(imageKey, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (uploadError) {
      this.logger.error(`Upload Supabase falhou (${uploadError.message}).`);
      throw new InternalServerErrorException(`Falha no upload da imagem: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(this.bucket).getPublicUrl(imageKey);

    if (!publicUrl) {
      throw new InternalServerErrorException('Não foi possível gerar URL pública da imagem.');
    }

    return {
      imageUrl: publicUrl,
      imageKey,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
    };
  }

  private createSupabaseClient() {
    const databaseUrlBucket =
      this.configService.get<string>('DATABASE_URL_BUCKET') ?? this.configService.get<string>('DATABASE_URL');
    const directUrlBucket = this.configService.get<string>('DIRECT_URL_BUCKET') ?? this.configService.get<string>('DIRECT_URL');
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

  private extractExtension(fileName: string, mimeType: string): string {
    const byName = fileName?.split('.').pop()?.toLowerCase();
    if (byName && byName.length <= 5) {
      return byName;
    }

    const byMime = mimeType?.split('/')[1]?.toLowerCase();
    return byMime || 'jpg';
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
