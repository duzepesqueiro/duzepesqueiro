import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationDto } from '../../../../../shared/dto/pagination.dto';
import { MovementReason, MovementType } from '../../../enums';

/**
 * DTO para criação de movimentação de estoque no kardex.
 */
export class CreateInventoryMovementDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsUUID('4', { message: 'O ID do produto deve ser um UUID válido.' })
  productId: string;

  @ApiProperty({ enum: MovementType, description: 'Tipo de movimentação no estoque' })
  @IsEnum(MovementType, { message: 'O tipo de movimentação é inválido.' })
  movementType: MovementType;

  @ApiProperty({ enum: MovementReason, description: 'Motivo da movimentação no estoque' })
  @IsEnum(MovementReason, { message: 'O motivo da movimentação é inválido.' })
  movementReason: MovementReason;

  @ApiProperty({ description: 'Quantidade movimentada', minimum: 0.001 })
  @IsNumber({}, { message: 'A quantidade deve ser um número.' })
  @Min(0.001, { message: 'A quantidade mínima para movimentação é 0.001.' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Observação da movimentação' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;

  @ApiPropertyOptional({ description: 'ID da referência externa relacionada' })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da referência deve ser um UUID válido.' })
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Tipo da referência externa' })
  @IsOptional()
  @IsString({ message: 'O tipo da referência deve ser um texto.' })
  referenceType?: string;
}

/**
 * DTO de item histórico retornado pelo kardex.
 */
export class MovementHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MovementType })
  movementType: MovementType;

  @ApiProperty({ enum: MovementReason })
  movementReason: MovementReason;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  previousBalance: number;

  @ApiProperty()
  nextBalance: number;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  referenceType?: string;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty()
  createdAt: Date;
}

/**
 * DTO de resposta paginada do kardex de estoque.
 */
export class KardexResponseDto {
  @ApiProperty({ type: [MovementHistoryDto] })
  items: MovementHistoryDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  currentBalance: number;
}

/**
 * DTO de filtros para consulta paginada de kardex.
 */
export class KardexFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID do produto' })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do produto deve ser um UUID válido.' })
  productId?: string;

  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType, { message: 'O tipo de movimentação é inválido.' })
  movementType?: MovementType;

  @ApiPropertyOptional({ enum: MovementReason })
  @IsOptional()
  @IsEnum(MovementReason, { message: 'O motivo de movimentação é inválido.' })
  movementReason?: MovementReason;

  @ApiPropertyOptional({ description: 'Data inicial em formato ISO-8601' })
  @IsOptional()
  @IsDateString({}, { message: 'A data inicial deve ser uma data válida.' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final em formato ISO-8601' })
  @IsOptional()
  @IsDateString({}, { message: 'A data final deve ser uma data válida.' })
  endDate?: string;
}
