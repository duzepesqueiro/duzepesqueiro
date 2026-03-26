import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class KpiPeriodQueryDto {
  @ApiProperty({ example: 7, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt({ message: 'month deve ser um número inteiro.' })
  @Min(1, { message: 'month deve ser maior ou igual a 1.' })
  @Max(12, { message: 'month deve ser menor ou igual a 12.' })
  month: number;

  @ApiProperty({ example: 2026, minimum: 2000 })
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  year: number;
}
