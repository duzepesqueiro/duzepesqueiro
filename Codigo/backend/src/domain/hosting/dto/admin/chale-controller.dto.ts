import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ChaleStatus, ChaleType } from '@prisma/client';

export class ListChalesQueryDTO {
  @ApiPropertyOptional({ description: 'Capacidade de adultos', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacidadeAdultos?: number;

  @ApiPropertyOptional({ description: 'Capacidade de crianças', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacidadeCriancas?: number;

  @ApiPropertyOptional({ enum: ChaleType, description: 'Tipo do chalé' })
  @IsOptional()
  @IsEnum(ChaleType)
  tipo?: ChaleType;

  @ApiPropertyOptional({ description: 'Data de check-in (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  checkin?: Date;

  @ApiPropertyOptional({ description: 'Data de check-out (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  checkout?: Date;
}

export class UpdateChaleStatusDTO {
  @ApiProperty({ enum: ChaleStatus, description: 'Novo status do chalé' })
  @IsEnum(ChaleStatus)
  status: ChaleStatus;
}

export class ListAvaliacoesQueryDTO {
  @ApiPropertyOptional({ description: 'Página', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DisponibilidadeChaleQueryDTO {
  @ApiProperty({ description: 'Data de check-in (ISO string)' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  checkin: Date;

  @ApiProperty({ description: 'Data de check-out (ISO string)' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  checkout: Date;

  @ApiPropertyOptional({ description: 'Capacidade de adultos', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacidadeAdultos?: number;

  @ApiPropertyOptional({ description: 'Capacidade de crianças', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacidadeCriancas?: number;

  @ApiPropertyOptional({ enum: ChaleType, description: 'Tipo do chalé para filtrar resultado' })
  @IsOptional()
  @IsEnum(ChaleType)
  tipo?: ChaleType;

  @ApiPropertyOptional({ description: 'ID do chalé para verificação direta' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.tipo)
  chaleId?: string;
}

export class ChaleCalendarioQueryDTO {
  @ApiPropertyOptional({ description: 'Data inicial da janela (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Data final da janela (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  to?: Date;
}
