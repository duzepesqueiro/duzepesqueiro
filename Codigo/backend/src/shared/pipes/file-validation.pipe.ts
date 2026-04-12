import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;
  private readonly allowedMimes = new Set([
    'image/jpg',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }

    if (!this.allowedMimes.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo inválido.');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException('Arquivo excede o limite de 5MB.');
    }

    return file;
  }
}
