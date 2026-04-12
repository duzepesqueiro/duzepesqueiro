import { ApiProperty } from '@nestjs/swagger';
import { RentalPeriod } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateRentalDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ enum: RentalPeriod })
  @IsEnum(RentalPeriod)
  period: RentalPeriod;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
