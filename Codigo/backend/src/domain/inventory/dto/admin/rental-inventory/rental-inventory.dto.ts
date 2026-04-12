import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EquipmentQuality } from '../../../enums';

/**
 * DTO para criação de registro de inventário de aluguel.
 */
export class CreateRentalInventoryDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsUUID('4', { message: 'O ID do produto deve ser um UUID válido.' })
  productId: string;

  @ApiProperty({ enum: EquipmentQuality, description: 'Qualidade atual do equipamento' })
  @IsEnum(EquipmentQuality, { message: 'A qualidade do equipamento é inválida.' })
  quality: EquipmentQuality;

  @ApiPropertyOptional({ description: 'Observação inicial do inventário' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}

/**
 * DTO para atualização da qualidade do inventário de aluguel.
 */
export class UpdateRentalInventoryDto {
  @ApiProperty({ enum: EquipmentQuality, description: 'Qualidade atual do equipamento' })
  @IsEnum(EquipmentQuality, { message: 'A qualidade do equipamento é inválida.' })
  quality: EquipmentQuality;

  @ApiPropertyOptional({ description: 'Observação de atualização' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}

/**
 * DTO para registrar uma nova verificação do equipamento de aluguel.
 */
export class PerformInspectionDto {
  @ApiProperty({ enum: EquipmentQuality, description: 'Nova qualidade identificada na verificação' })
  @IsEnum(EquipmentQuality, { message: 'A nova qualidade informada é inválida.' })
  newQuality: EquipmentQuality;

  @ApiPropertyOptional({ description: 'Observação da verificação realizada' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}

/**
 * DTO de resposta do inventário de aluguel.
 */
export class RentalInventoryResponseDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productSku: string;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty({ enum: EquipmentQuality })
  quality: EquipmentQuality;

  @ApiProperty()
  lastInspectionAt: Date;

  @ApiPropertyOptional()
  note?: string;
}
