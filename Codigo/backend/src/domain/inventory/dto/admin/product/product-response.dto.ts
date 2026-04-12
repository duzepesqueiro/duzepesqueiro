import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProductCategory,
  ProductStatus,
  TurnoverRate,
  UnitMeasure,
} from '../../../enums';

/**
 * DTO resumido de fornecedor para respostas de produto.
 */
export class SupplierSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  cnpj: string;
}

/**
 * DTO de resposta detalhada de produto.
 */
export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiPropertyOptional({ type: [String] })
  images?: string[];

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty({ enum: ProductCategory })
  category: ProductCategory;

  @ApiProperty({ enum: UnitMeasure })
  unitMeasure: UnitMeasure;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  minimumLimit: number;

  @ApiProperty()
  suggestedQuantity: number;

  @ApiProperty()
  costPrice: number;

  @ApiProperty()
  salePrice: number;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  restockDate?: Date;

  @ApiProperty({ enum: TurnoverRate })
  turnoverRate: TurnoverRate;

  @ApiPropertyOptional({ type: SupplierSummaryDto })
  supplier?: SupplierSummaryDto;

  @ApiProperty()
  createdBy: string;

  @ApiPropertyOptional()
  editedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;

  @ApiProperty()
  isLowStock: boolean;

  @ApiProperty()
  totalValue: number;
}
