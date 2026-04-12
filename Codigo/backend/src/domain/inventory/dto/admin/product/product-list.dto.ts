import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../../shared/dto/pagination.dto';
import { ProductCategory, ProductStatus, TurnoverRate } from '../../../enums';

/**
 * DTO para filtros de listagem paginada de produtos.
 */
export class ProductListFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus, { message: 'O status informado é inválido.' })
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory, { message: 'A categoria informada é inválida.' })
  category?: ProductCategory;

  @ApiPropertyOptional({ enum: TurnoverRate })
  @IsOptional()
  @IsEnum(TurnoverRate, { message: 'A rotatividade informada é inválida.' })
  turnoverRate?: TurnoverRate;

  @ApiPropertyOptional({ description: 'ID do fornecedor' })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do fornecedor deve ser um UUID válido.' })
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Busca por nome ou SKU' })
  @IsOptional()
  @IsString({ message: 'O campo de busca deve ser um texto.' })
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar apenas produtos com estoque baixo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O campo lowStockOnly deve ser booleano.' })
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ description: 'Incluir produtos deletados logicamente' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'O campo includeDeleted deve ser booleano.' })
  includeDeleted?: boolean;
}

/**
 * DTO de item resumido na listagem de produtos.
 */
export class ProductListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty({ enum: ProductCategory })
  category: ProductCategory;

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  minimumLimit: number;

  @ApiProperty()
  salePrice: number;

  @ApiProperty()
  supplierName: string;

  @ApiProperty()
  isLowStock: boolean;
}

/**
 * DTO de resposta paginada para listagem de produtos.
 */
export class ProductListResponseDto {
  @ApiProperty({ type: [ProductListItemDto] })
  items: ProductListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  totalPages: number;
}
