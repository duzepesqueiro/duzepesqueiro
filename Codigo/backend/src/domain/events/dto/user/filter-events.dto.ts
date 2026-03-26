import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const USER_EVENT_STATUSES = ['ALL', 'UPCOMING', 'CANCELLED'] as const;
const EVENT_CAPACITY_OPTIONS = [50, 150, 200] as const;

export class FilterEventsDto {
  @ApiPropertyOptional({
    description: 'Busca por nome ou trecho do nome do evento',
    example: 'torneio',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O nome deve ser um texto.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Data no formato dd/mm/yyyy',
    example: '31/12/2026',
  })
  @IsOptional()
  @IsString({ message: 'A data deve ser um texto.' })
  @Matches(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, {
    message: 'A data deve estar no formato dd/mm/yyyy.',
  })
  date?: string;

  @ApiPropertyOptional({
    description: 'Capacidade permitida de participantes',
    example: 150,
    enum: EVENT_CAPACITY_OPTIONS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'A capacidade deve ser um número.' })
  @IsIn(EVENT_CAPACITY_OPTIONS, {
    message: 'A capacidade deve ser 50, 150 ou 200.',
  })
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Horário no formato hh:mm',
    example: '19:30',
  })
  @IsOptional()
  @IsString({ message: 'O horário deve ser um texto.' })
  @Matches(/^([01][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'O horário deve estar no formato hh:mm.',
  })
  time?: string;

  @ApiPropertyOptional({
    description: 'Status de visualização para listagem pública',
    enum: USER_EVENT_STATUSES,
    example: 'UPCOMING',
  })
  @IsOptional()
  @IsString({ message: 'O status deve ser um texto.' })
  @IsIn(USER_EVENT_STATUSES, {
    message: 'O status deve ser ALL, UPCOMING ou CANCELLED.',
  })
  status?: (typeof USER_EVENT_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Página atual', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser maior ou igual a 1.' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite deve ser maior ou igual a 1.' })
  @Max(100, { message: 'O limite deve ser menor ou igual a 100.' })
  limit?: number;
}
