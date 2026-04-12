import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BlockReason } from '@prisma/client';

export class ListBloqueiosQueryDTO {
  @ApiPropertyOptional({ description: 'ID do chalé' })
  @IsOptional()
  @IsUUID()
  chaleId?: string;

  @ApiPropertyOptional({ description: 'Status ativo do bloqueio' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: BlockReason, description: 'Motivo do bloqueio' })
  @IsOptional()
  @IsEnum(BlockReason)
  reason?: BlockReason;

  @ApiPropertyOptional({ description: 'Data inicial mínima (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataInicioFrom?: Date;

  @ApiPropertyOptional({ description: 'Data final máxima (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataFimTo?: Date;
}

export class CreateBloqueioRequestDTO {
  @ApiProperty({ description: 'ID do chalé' })
  @IsUUID()
  chaletId: string;

  @ApiProperty({ description: 'Data de início (ISO string)' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataInicio: Date;

  @ApiProperty({ description: 'Data de fim (ISO string)' })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataFim: Date;

  @ApiPropertyOptional({ enum: BlockReason, description: 'Motivo do bloqueio' })
  @IsOptional()
  @IsEnum(BlockReason)
  reason?: BlockReason;

  @ApiPropertyOptional({ description: 'Observações do bloqueio' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Bloqueio ativo', default: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBloqueioRequestDTO {
  @ApiPropertyOptional({ description: 'ID do chalé' })
  @IsOptional()
  @IsUUID()
  chaletId?: string;

  @ApiPropertyOptional({ description: 'Data de início (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataInicio?: Date;

  @ApiPropertyOptional({ description: 'Data de fim (ISO string)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  dataFim?: Date;

  @ApiPropertyOptional({ enum: BlockReason, nullable: true, description: 'Motivo do bloqueio' })
  @IsOptional()
  @IsEnum(BlockReason)
  reason?: BlockReason;

  @ApiPropertyOptional({ description: 'Observações do bloqueio' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Bloqueio ativo' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;
}
