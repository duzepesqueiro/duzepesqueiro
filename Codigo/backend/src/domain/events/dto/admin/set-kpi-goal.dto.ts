import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Min, Max } from 'class-validator';

const KPI_TYPES = [
  'ACTIVE_EVENTS',
  'REGISTERED_PARTICIPANTS',
  'REGISTRATION_PERCENTAGE',
  'SOLD_OUT_EVENTS',
] as const;

export class SetKpiGoalDto {
  @ApiProperty({ enum: KPI_TYPES, example: 'REGISTERED_PARTICIPANTS' })
  @IsIn(KPI_TYPES, {
    message:
      'kpiType deve ser ACTIVE_EVENTS, REGISTERED_PARTICIPANTS, REGISTRATION_PERCENTAGE ou SOLD_OUT_EVENTS.',
  })
  kpiType: (typeof KPI_TYPES)[number];

  @ApiProperty({ minimum: 0, example: 100 })
  @Type(() => Number)
  @IsNumber({}, { message: 'targetValue deve ser um número.' })
  @Min(0, { message: 'targetValue deve ser maior ou igual a 0.' })
  targetValue: number;

  @ApiProperty({ minimum: 1, maximum: 12, example: 7 })
  @Type(() => Number)
  @IsInt({ message: 'month deve ser um número inteiro.' })
  @Min(1, { message: 'month deve ser maior ou igual a 1.' })
  @Max(12, { message: 'month deve ser menor ou igual a 12.' })
  month: number;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt({ message: 'year deve ser um número inteiro.' })
  @Min(2000, { message: 'year deve ser maior ou igual a 2000.' })
  year: number;
}
