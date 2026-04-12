import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de item de produto com estoque baixo para painel de KPI.
 */
export class ProductLowStockDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  stockQuantity: number;

  @ApiProperty()
  minimumLimit: number;
}

/**
 * DTO de KPI para valor total do estoque.
 */
export class TotalStockValueKpiDto {
  @ApiProperty()
  totalValue: number;

  @ApiProperty()
  percentageVariation: number;

  @ApiProperty()
  previousMonthValue: number;
}

/**
 * DTO de KPI para giro de estoque.
 */
export class StockTurnoverKpiDto {
  @ApiProperty()
  annualTurnover: number;

  @ApiProperty()
  annualAverageStock: number;

  @ApiProperty()
  annualCogs: number;
}

/**
 * DTO de KPI para ruptura de estoque.
 */
export class StockoutKpiDto {
  @ApiProperty()
  stockoutPercentage: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  stockoutItems: number;
}

/**
 * DTO de KPI para itens em estoque baixo.
 */
export class LowStockKpiDto {
  @ApiProperty()
  totalLowStockItems: number;

  @ApiProperty({ type: [ProductLowStockDto] })
  items: ProductLowStockDto[];
}

/**
 * DTO de KPI para estoque envelhecido.
 */
export class AgedStockKpiDto {
  @ApiProperty()
  agedStockValue: number;

  @ApiProperty()
  daysWithoutMovement: number;
}

/**
 * DTO consolidado de dashboard de estoque.
 */
export class InventoryDashboardDto {
  @ApiProperty({ type: TotalStockValueKpiDto })
  totalStockValue: TotalStockValueKpiDto;

  @ApiProperty({ type: StockTurnoverKpiDto })
  stockTurnover: StockTurnoverKpiDto;

  @ApiProperty({ type: StockoutKpiDto })
  stockout: StockoutKpiDto;

  @ApiProperty({ type: LowStockKpiDto })
  lowStock: LowStockKpiDto;

  @ApiProperty({ type: AgedStockKpiDto })
  agedStock: AgedStockKpiDto;

  @ApiProperty()
  lastUpdatedAt: Date;
}
