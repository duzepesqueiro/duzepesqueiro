import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewDomain } from '@prisma/client';

export class ReviewDTO {
  @ApiProperty({ example: 'e2f00ef2-a4c4-478e-b901-33f0f39b37a2' })
  id: string;

  @ApiProperty({ enum: ReviewDomain, example: ReviewDomain.HOSTING })
  domain: ReviewDomain;

  @ApiProperty({ example: 'f1c3a8fe-2d3c-4c49-8f7c-7d2f2f2b6b1a' })
  subjectId: string;

  @ApiProperty({ example: 'c1d9d9e9-5a7b-4d5e-8d74-9e3d9b6f1a2c' })
  targetId: string;

  @ApiPropertyOptional({ example: 'Chalé Vista da Serra' })
  targetName: string | null;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ example: 'Excelente experiência, chalé muito confortável.' })
  comment: string | null;

  @ApiProperty({ example: 'João Silva' })
  authorName: string;

  @ApiProperty({ example: '2026-05-13T12:00:00.000Z' })
  createdAt: Date;
}

