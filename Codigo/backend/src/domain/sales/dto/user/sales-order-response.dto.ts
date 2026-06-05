import { ApiProperty } from '@nestjs/swagger';

export class SalesOrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  nameSnapshot: string;

  @ApiProperty({ required: false })
  imageSnapshot?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  subtotal: number;
}

export class SalesOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ required: false })
  note?: string;

  @ApiProperty({ required: false })
  paymentId?: string;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty({ required: false })
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [SalesOrderItemResponseDto] })
  items: SalesOrderItemResponseDto[];
}

export class SalesOrderListResponseDto {
  @ApiProperty({ type: [SalesOrderResponseDto] })
  items: SalesOrderResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  totalPages: number;
}
