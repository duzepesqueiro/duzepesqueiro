import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { RentalPeriodDto } from '../common';
import { IsAfterDate } from '../common/validators';

export class CreateRentalBookingDto extends RentalPeriodDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: '2026-03-28' })
  @IsDateString()
  rentalDate: string;

  @ApiProperty({ example: '2026-03-29' })
  @IsDateString()
  @IsAfterDate('rentalDate')
  returnDate: string;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
