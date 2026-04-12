import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemCondition, RentalStatus } from '@prisma/client';

export class RentalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rentalId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ enum: RentalStatus, enumName: 'RentalStatus' })
  status: RentalStatus;

  @ApiPropertyOptional({ enum: ItemCondition, enumName: 'ItemCondition' })
  returnCondition?: ItemCondition;

  @ApiProperty()
  totalAmount: number;

  @ApiPropertyOptional()
  checkOutAt?: Date;

  @ApiPropertyOptional()
  checkInAt?: Date;

  @ApiProperty()
  createdAt: Date;
}
