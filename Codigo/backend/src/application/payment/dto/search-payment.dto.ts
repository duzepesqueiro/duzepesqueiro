import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IPaymentDomain, IPaymentStatus } from '../interfaces';

export class SearchPaymentDto {
  @ApiPropertyOptional({
    enum: ['date_created', 'date_approved', 'date_last_updated', 'id'],
  })
  @IsOptional()
  @IsEnum(['date_created', 'date_approved', 'date_last_updated', 'id'])
  sort?: 'date_created' | 'date_approved' | 'date_last_updated' | 'id';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  criteria?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerId?: string;

  @ApiPropertyOptional({ enum: IPaymentDomain })
  @IsOptional()
  @IsEnum(IPaymentDomain)
  domain?: IPaymentDomain;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: ['date_created', 'date_last_updated', 'date_approved'] })
  @IsOptional()
  @IsEnum(['date_created', 'date_last_updated', 'date_approved'])
  range?: 'date_created' | 'date_last_updated' | 'date_approved';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  beginDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: IPaymentStatus })
  @IsOptional()
  @IsEnum(IPaymentStatus)
  status?: IPaymentStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  fetchAllPages?: boolean;
}
