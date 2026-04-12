import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, RentalOrigin } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { RentalPeriodDto } from '../common';
import { IsAfterDate } from '../common/validators';

export class CreateRentalDto extends RentalPeriodDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: RentalOrigin, enumName: 'RentalOrigin' })
  @IsEnum(RentalOrigin)
  origin: RentalOrigin;

  @ApiProperty({ example: '2026-03-28' })
  @IsDateString()
  rentalDate: string;

  @ApiProperty({ example: '2026-03-29' })
  @IsDateString()
  @IsAfterDate('rentalDate')
  returnDate: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  totalAmount: number;

  @ApiPropertyOptional({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
