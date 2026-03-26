import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo de imagem do evento',
  })
  @IsDefined({ message: 'O arquivo de imagem é obrigatório.' })
  file: Express.Multer.File;
}
