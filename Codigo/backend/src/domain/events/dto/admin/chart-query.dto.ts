import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MonthlyChartQueryDto {
  @ApiProperty({ example: 2026, minimum: 2000 })
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  year: number;
}

export class YearlyChartQueryDto {
  @ApiProperty({ example: 2024, minimum: 2000 })
  @Type(() => Number)
  @IsInt({ message: 'startYear deve ser um número inteiro.' })
  @Min(2000, { message: 'startYear deve ser maior ou igual a 2000.' })
  startYear: number;

  @ApiProperty({ example: 2026, minimum: 2000 })
  @Type(() => Number)
  @IsInt({ message: 'endYear deve ser um número inteiro.' })
  @Min(2000, { message: 'endYear deve ser maior ou igual a 2000.' })
  endYear: number;
}

export class StatusDistributionQueryDto {
  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'month deve ser um número inteiro.' })
  @Min(1, { message: 'month deve ser maior ou igual a 1.' })
  @Max(12, { message: 'month deve ser menor ou igual a 12.' })
  month?: number;

  @ApiPropertyOptional({ example: 2026, minimum: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  year?: number;
}

export class TrendChartQueryDto {
  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 24, default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'months deve ser um número inteiro.' })
  @Min(1, { message: 'months deve ser maior ou igual a 1.' })
  @Max(24, { message: 'months deve ser menor ou igual a 24.' })
  months?: number;
}

export class TopEventsQueryDto {
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 50, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro.' })
  @Min(1, { message: 'limit deve ser maior ou igual a 1.' })
  @Max(50, { message: 'limit deve ser menor ou igual a 50.' })
  limit?: number;

  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'month deve ser um número inteiro.' })
  @Min(1, { message: 'month deve ser maior ou igual a 1.' })
  @Max(12, { message: 'month deve ser menor ou igual a 12.' })
  month?: number;

  @ApiPropertyOptional({ example: 2026, minimum: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  year?: number;
}
