import { ApiProperty } from '@nestjs/swagger';
import { RentalPeriod } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';
import { IsValidRentalPeriod } from './validators';

export class RentalPeriodDto {
  @ApiProperty({ enum: RentalPeriod, enumName: 'RentalPeriod' })
  @IsEnum(RentalPeriod)
  periodType: RentalPeriod;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsValidRentalPeriod('periodType')
  periodValue: number;
}
