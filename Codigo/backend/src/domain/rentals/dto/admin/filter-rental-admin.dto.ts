import { ApiPropertyOptional } from '@nestjs/swagger';
import { RentalOrigin, RentalStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FilterRentalAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: RentalStatus, enumName: 'RentalStatus' })
  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus;

  @ApiPropertyOptional({ enum: RentalOrigin, enumName: 'RentalOrigin' })
  @IsOptional()
  @IsEnum(RentalOrigin)
  origin?: RentalOrigin;

  @ApiPropertyOptional({ example: '2026-03-28' })
  @IsOptional()
  @IsDateString()
  rentalDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-30' })
  @IsOptional()
  @IsDateString()
  rentalDateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
