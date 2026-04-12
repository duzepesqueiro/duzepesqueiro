import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de métricas agregadas de desempenho do fornecedor.
 */
export class SupplierMetricsDto {
  @ApiProperty()
  totalOrders: number;

  @ApiProperty()
  accumulatedValue: number;

  @ApiProperty()
  totalItemsPurchased: number;

  @ApiProperty()
  onTimeDeliveries: number;

  @ApiProperty()
  onTimePercentage: number;
}

/**
 * DTO de resposta detalhada de fornecedor.
 */
export class SupplierResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiProperty({ type: SupplierMetricsDto })
  metrics: SupplierMetricsDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;
}
