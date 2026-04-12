import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ProductCategory,
  ProductStatus,
  TurnoverRate,
  UnitMeasure,
} from '../../../enums';

/**
 * DTO para criação de um novo produto de estoque.
 */
export class CreateProductDto {
  @ApiProperty({ description: 'Nome do produto', maxLength: 255 })
  @IsNotEmpty({ message: 'O nome do produto é obrigatório.' })
  @MaxLength(255, { message: 'O nome do produto deve ter no máximo 255 caracteres.' })
  name: string;

  @ApiPropertyOptional({ description: 'Descrição do produto', maxLength: 4000 })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(4000, { message: 'A descrição deve ter no máximo 4000 caracteres.' })
  description?: string;

  @ApiProperty({ enum: ProductStatus, description: 'Status operacional do produto' })
  @IsEnum(ProductStatus, { message: 'O status do produto é inválido.' })
  status: ProductStatus;

  @ApiProperty({ enum: ProductCategory, description: 'Categoria do produto' })
  @IsEnum(ProductCategory, { message: 'A categoria do produto é inválida.' })
  category: ProductCategory;

  @ApiProperty({ enum: UnitMeasure, description: 'Unidade de medida do produto' })
  @IsEnum(UnitMeasure, { message: 'A unidade de medida é inválida.' })
  unitMeasure: UnitMeasure;

  @ApiPropertyOptional({ description: 'Quantidade inicial em estoque', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade em estoque deve ser um número.' })
  @Min(0, { message: 'A quantidade em estoque não pode ser negativa.' })
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Limite mínimo para alerta de estoque', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O limite mínimo deve ser um número.' })
  @Min(0, { message: 'O limite mínimo não pode ser negativo.' })
  minimumLimit?: number;

  @ApiPropertyOptional({ description: 'Quantidade sugerida para recompra', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade sugerida deve ser um número.' })
  @Min(0, { message: 'A quantidade sugerida não pode ser negativa.' })
  suggestedQuantity?: number;

  @ApiProperty({ description: 'Preço de custo', minimum: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço de custo deve ser um número.' })
  @Min(0, { message: 'O preço de custo não pode ser negativo.' })
  costPrice: number;

  @ApiProperty({ description: 'Preço de venda', minimum: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço de venda deve ser um número.' })
  @Min(0, { message: 'O preço de venda não pode ser negativo.' })
  salePrice: number;

  @ApiPropertyOptional({ description: 'Localização logística', maxLength: 255 })
  @IsOptional()
  @MaxLength(255, { message: 'A localização deve ter no máximo 255 caracteres.' })
  location?: string;

  @ApiPropertyOptional({ description: 'Data de reabastecimento em formato ISO-8601' })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'A data de reabastecimento deve estar em formato de data válido.' },
  )
  restockDate?: string;

  @ApiProperty({ description: 'ID do fornecedor' })
  @IsUUID('4', { message: 'O ID do fornecedor deve ser um UUID válido.' })
  supplierId: string;

  @ApiPropertyOptional({ enum: TurnoverRate, description: 'Rotatividade do produto' })
  @IsOptional()
  @IsEnum(TurnoverRate, { message: 'A rotatividade do produto é inválida.' })
  turnoverRate?: TurnoverRate;
}
