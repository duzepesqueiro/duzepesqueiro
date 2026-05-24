import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

type UploadResult = {
  url: string;
  key: string;
};

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly maxFilesPerEvent = 10;
  private readonly uploadRoot = join(process.cwd(), 'uploads');
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);

  async uploadEventImage(file: Express.Multer.File): Promise<UploadResult> {
    this.validateFile(file);
    const extension = this.extractExtension(file.originalname);
    const key = `events/${new Date().getFullYear()}/${randomUUID()}.${extension}`;
    const baseUrl = (process.env.EVENTS_IMAGE_BASE_URL ?? '/uploads').replace(/\/$/, '');
    const url = `${baseUrl}/${key}`;

    const destPath = join(this.uploadRoot, key);
    await fs.mkdir(dirname(destPath), { recursive: true });

    if (file.path) {
      await fs.rename(file.path, destPath);
    } else if (file.buffer) {
      await fs.writeFile(destPath, file.buffer);
    }

    this.logger.log(`Imagem de evento salva key=${key}`);
    return { url, key };
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
    try {
      await fs.unlink(join(this.uploadRoot, key));
      this.logger.log(`Arquivo removido key=${key}`);
    } catch {
      this.logger.warn(`Arquivo não encontrado para remoção key=${key}`);
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
}
