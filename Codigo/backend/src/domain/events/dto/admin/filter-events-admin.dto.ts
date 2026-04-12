import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const EVENT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'UPCOMING',
] as const;

export class FilterEventsAdminDto {
  @ApiPropertyOptional({ example: 'Festival' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O título deve ser um texto.' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres.' })
  title?: string;

  @ApiPropertyOptional({ example: '31/12/2026' })
  @IsOptional()
  @IsString({ message: 'A data deve ser um texto.' })
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'A data deve estar no formato dd/mm/yyyy.',
  })
  date?: string;

  @ApiPropertyOptional({ example: '19:30' })
  @IsOptional()
  @IsString({ message: 'O horário deve ser um texto.' })
  @Matches(/^([01][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'O horário deve estar no formato hh:mm.',
  })
  time?: string;

  @ApiPropertyOptional({ example: 'Rancho do Lago' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'A localização deve ser um texto.' })
  @MaxLength(150, { message: 'A localização deve ter no máximo 150 caracteres.' })
  location?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O número de participantes deve ser inteiro.' })
  @Min(0, { message: 'O número de participantes deve ser maior ou igual a 0.' })
  participants?: number;

  @ApiPropertyOptional({ enum: EVENT_STATUSES, example: 'SCHEDULED' })
  @IsOptional()
  @IsString({ message: 'O status deve ser um texto.' })
  @IsIn(EVENT_STATUSES, {
    message:
      'O status deve ser SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED ou UPCOMING.',
  })
  status?: (typeof EVENT_STATUSES)[number];

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser maior ou igual a 1.' })
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser maior ou igual a 1.' })
  @Max(100, { message: 'O limite deve ser menor ou igual a 100.' })
  limit?: number;
}
