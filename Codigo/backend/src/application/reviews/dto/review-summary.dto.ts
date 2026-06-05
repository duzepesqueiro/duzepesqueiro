import { ApiProperty } from '@nestjs/swagger';
import { ReviewDomain } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class ReviewSummaryQueryDTO {
  @ApiProperty({ enum: ReviewDomain, example: ReviewDomain.HOSTING })
  @IsEnum(ReviewDomain, { message: 'domain deve ser um domínio válido.' })
  domain: ReviewDomain;

  @ApiProperty({ example: 'e2f00ef2-a4c4-478e-b901-33f0f39b37a2' })
  @IsNotEmpty({ message: 'targetId é obrigatório.' })
  @IsUUID('4', { message: 'targetId deve ser um UUID válido.' })
  targetId: string;
}

export class ReviewSummaryDTO {
  @ApiProperty({ example: 4.8 })
  averageRating: number;

  @ApiProperty({ example: 32 })
  reviewsCount: number;
}

