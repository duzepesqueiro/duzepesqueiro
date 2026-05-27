import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ProductImageStorageService {
  private readonly logger = new Logger(ProductImageStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async upload(file: Express.Multer.File): Promise<string> {
    if (!file?.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Arquivo inválido. Envie uma imagem.');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Arquivo excede o limite de 2MB.');
    }

    const databaseUrlBucket =
      this.configService.get<string>('DATABASE_URL_BUCKET') ??
      this.configService.get<string>('DATABASE_URL');
    const directUrlBucket =
      this.configService.get<string>('DIRECT_URL_BUCKET') ??
      this.configService.get<string>('DIRECT_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = 'product-images';

    if (!supabaseServiceKey || (!databaseUrlBucket && !directUrlBucket)) {
      return this.uploadLocally(file);
    }

    if (!databaseUrlBucket && !directUrlBucket) {
      throw new InternalServerErrorException('Variáveis DATABASE_URL_BUCKET/DIRECT_URL_BUCKET não configuradas.');
    }

    const parsed = this.parseSupabaseFromDatabaseUrl(directUrlBucket || databaseUrlBucket || '');
    if (!parsed?.url) {
      return this.uploadLocally(file);
    }
    if (!parsed?.url) {
      throw new InternalServerErrorException('Não foi possível derivar URL do projeto Supabase a partir do .env.');
    }
    if (!supabaseServiceKey) {
      throw new InternalServerErrorException(
        'SUPABASE_SERVICE_ROLE_KEY não configurada. As URLs do banco (DATABASE_URL/DIRECT_URL) não autenticam no Storage.',
      );
    }
    const { url: supabaseUrl } = parsed;

    const extension = this.extractExtension(file.originalname, file.mimetype);
    const objectPath = `products/${new Date().getFullYear()}/${randomUUID()}.${extension}`;

    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: currentBucket, error: bucketCheckError } = await client.storage.getBucket(bucket);
    if (bucketCheckError || !currentBucket) {
      const { error: createBucketError } = await client.storage.createBucket(bucket, { public: true });
      if (createBucketError) {
        throw new InternalServerErrorException(
          `Bucket '${bucket}' inexistente e não foi possível criar automaticamente: ${createBucketError.message}`,
        );
      }
    }

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`Upload Supabase falhou (${uploadError.message}).`);
      throw new InternalServerErrorException(`Falha no upload da imagem: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = client.storage.from(bucket).getPublicUrl(objectPath);

    if (!publicUrl) {
      throw new InternalServerErrorException('Não foi possível gerar URL pública da imagem.');
    }

    return publicUrl;
  }

  private async uploadLocally(file: Express.Multer.File): Promise<string> {
    if (!file.buffer?.length) {
      throw new InternalServerErrorException('Arquivo recebido sem conteudo para salvar.');
    }

    const extension = this.extractExtension(file.originalname, file.mimetype);
    const year = new Date().getFullYear().toString();
    const fileName = `${randomUUID()}.${extension}`;
    const relativePath = `products/${year}/${fileName}`;
    const uploadsDir = join(process.cwd(), 'uploads', 'products', year);

    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, fileName), file.buffer);

    return `/api/uploads/${relativePath}`;
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
