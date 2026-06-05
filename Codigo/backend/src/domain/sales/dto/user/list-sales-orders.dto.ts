import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../../shared/dto/pagination.dto';

export enum SalesOrderStatusDto {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class ListSalesOrdersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SalesOrderStatusDto })
  @IsOptional()
  @IsEnum(SalesOrderStatusDto)
  status?: SalesOrderStatusDto;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
