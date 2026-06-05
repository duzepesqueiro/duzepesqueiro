import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewDomain } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListReviewsQueryDTO {
  @ApiProperty({ enum: ReviewDomain, example: ReviewDomain.HOSTING })
  @IsEnum(ReviewDomain, { message: 'domain deve ser um domínio válido.' })
  domain: ReviewDomain;

  @ApiProperty({ example: 'e2f00ef2-a4c4-478e-b901-33f0f39b37a2' })
  @IsNotEmpty({ message: 'targetId é obrigatório.' })
  @IsUUID('4', { message: 'targetId deve ser um UUID válido.' })
  targetId: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page deve ser um inteiro.' })
  @Min(1, { message: 'page deve ser no mínimo 1.' })
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um inteiro.' })
  @Min(1, { message: 'limit deve ser no mínimo 1.' })
  @Max(50, { message: 'limit deve ser no máximo 50.' })
  limit?: number;
}

