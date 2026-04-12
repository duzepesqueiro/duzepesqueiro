import { ApiPropertyOptional } from '@nestjs/swagger';
import { RentalStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FilterRentalDto {
  @ApiPropertyOptional({ enum: RentalStatus, enumName: 'RentalStatus' })
  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus;
}
