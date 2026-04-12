import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus, OrderPriority, PurchaseOrderStatus } from '../../../enums';

/**
 * DTO resumido de fornecedor para resposta de ordem de compra.
 */
export class PurchaseOrderSupplierSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  cnpj: string;
}

/**
 * DTO resumido de produto para itens de ordem de compra.
 */
export class PurchaseOrderProductSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;
}

/**
 * DTO de item de resposta da ordem de compra.
 */
export class PurchaseOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  receivedQuantity: number;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ type: PurchaseOrderProductSummaryDto })
  product: PurchaseOrderProductSummaryDto;

  @ApiProperty()
  createdAt: Date;
}

/**
 * DTO de resposta detalhada de ordem de compra.
 */
export class PurchaseOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  supplierId: string;

  @ApiProperty({ enum: PurchaseOrderStatus })
  status: PurchaseOrderStatus;

  @ApiProperty({ enum: DeliveryStatus })
  deliveryStatus: DeliveryStatus;

  @ApiProperty({ enum: OrderPriority })
  priority: OrderPriority;

  @ApiProperty()
  orderDate: Date;

  @ApiProperty()
  expectedDeliveryDate: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiProperty()
  totalAmount: number;

  @ApiPropertyOptional()
  note?: string;

  @ApiProperty({ type: PurchaseOrderSupplierSummaryDto })
  supplier: PurchaseOrderSupplierSummaryDto;

  @ApiProperty({ type: [PurchaseOrderItemResponseDto] })
  items: PurchaseOrderItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  deletedAt?: Date;
}
