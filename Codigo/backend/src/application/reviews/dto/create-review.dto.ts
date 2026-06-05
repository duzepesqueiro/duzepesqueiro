import { ApiProperty } from '@nestjs/swagger';
import { ReviewDomain } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewRequestDTO {
  @ApiProperty({ enum: ReviewDomain, example: ReviewDomain.HOSTING })
  @IsEnum(ReviewDomain, { message: 'domain deve ser um domínio válido.' })
  domain: ReviewDomain;

  @ApiProperty({
    description: 'ID da entidade concluída que está sendo avaliada (ex.: reservationId, rentalId, registrationId, paymentId).',
    example: 'e2f00ef2-a4c4-478e-b901-33f0f39b37a2',
  })
  @IsNotEmpty({ message: 'subjectId é obrigatório.' })
  @IsUUID('4', { message: 'subjectId deve ser um UUID válido.' })
  subjectId: string;

  @ApiProperty({ description: 'Nota de 1 a 5', example: 5 })
  @Type(() => Number)
  @IsInt({ message: 'rating deve ser um inteiro.' })
  @Min(1, { message: 'rating deve ser no mínimo 1.' })
  @Max(5, { message: 'rating deve ser no máximo 5.' })
  rating: number;

  @ApiProperty({ description: 'Comentário do usuário', example: 'Excelente experiência, recomendo!' })
  @IsString({ message: 'comment deve ser um texto.' })
  @IsNotEmpty({ message: 'comment é obrigatório.' })
  @MinLength(10, { message: 'comment deve ter no mínimo 10 caracteres.' })
  @MaxLength(1000, { message: 'comment deve ter no máximo 1000 caracteres.' })
  comment: string;
}

