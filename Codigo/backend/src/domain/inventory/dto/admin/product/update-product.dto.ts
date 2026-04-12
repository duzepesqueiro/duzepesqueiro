import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { MovementReason, MovementType } from '../../../enums';

/**
 * DTO para atualização parcial de produto.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ description: 'Preço de custo (apenas ADMIN)', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço de custo deve ser um número.' })
  @Min(0, { message: 'O preço de custo não pode ser negativo.' })
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Preço de venda (apenas ADMIN)', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço de venda deve ser um número.' })
  @Min(0, { message: 'O preço de venda não pode ser negativo.' })
  salePrice?: number;
}

/**
 * DTO para ajuste manual de estoque e geração de movimentação kardex.
 */
export class UpdateStockDto {
  @ApiProperty({ description: 'Quantidade a ajustar no estoque' })
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade deve ser um número.' })
  quantity: number;

  @ApiProperty({ enum: MovementType, description: 'Tipo de movimentação de estoque' })
  @IsEnum(MovementType, { message: 'O tipo de movimentação é inválido.' })
  movementType: MovementType;

  @ApiProperty({ enum: MovementReason, description: 'Motivo da movimentação' })
  @IsEnum(MovementReason, { message: 'O motivo da movimentação é inválido.' })
  movementReason: MovementReason;

  @ApiPropertyOptional({ description: 'Observação complementar da movimentação' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;

  @ApiPropertyOptional({ description: 'Referência externa relacionada à movimentação' })
  @IsOptional()
  @IsUUID('4', { message: 'A referência deve ser um UUID válido.' })
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Tipo da referência externa' })
  @IsOptional()
  @IsString({ message: 'O tipo de referência deve ser um texto.' })
  referenceType?: string;
}
