import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  capture?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  transactionAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfExpiration?: string;
}
