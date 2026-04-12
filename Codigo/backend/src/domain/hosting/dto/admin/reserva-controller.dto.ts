import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { CreateHospedeDTO } from './create-hospede.dto';

export class ListReservasQueryDTO {
  @ApiPropertyOptional({ enum: ReservationStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value;
    }
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  })
  @IsEnum(ReservationStatus, { each: true })
  status?: ReservationStatus[];

  @ApiPropertyOptional({ description: 'ID do chalé' })
  @IsOptional()
  @IsString()
  chaleId?: string;

  @ApiPropertyOptional({ description: 'Data de check-in (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataCheckin?: Date;

  @ApiPropertyOptional({ description: 'Data de check-out (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataCheckout?: Date;

  @ApiPropertyOptional({ description: 'Busca por código, nome ou e-mail' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CancelarReservaDTO {
  @ApiProperty({ description: 'Motivo do cancelamento' })
  @IsString()
  motivo: string;
}

export class EnviarVoucherDTO {
  @ApiPropertyOptional({ enum: ['email'], default: 'email' })
  @IsOptional()
  @IsIn(['email'])
  canal?: 'email';
}

export class CalculoReservaQueryDTO {
  @ApiPropertyOptional({ description: 'Número de adultos', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numAdultos?: number;

  @ApiPropertyOptional({ description: 'Número de crianças', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numCriancas?: number;
}

export class AdicionarHospedeDTO extends CreateHospedeDTO {}
