import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

type UploadResult = {
  url: string;
  key: string;
};

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
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
    const baseUrl = process.env.EVENTS_IMAGE_BASE_URL ?? 'https://storage.duzepesqueiro.local';
    const url = `${baseUrl.replace(/\/$/, '')}/${key}`;

    this.logger.log(`Imagem de evento processada key=${key}`);
    return { url, key };
  }

  async deleteFile(key?: string | null): Promise<void> {
    if (!key) {
      return;
    }
    this.logger.log(`Remoção lógica de arquivo solicitada key=${key}`);
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
