import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ChaleStatus, ChaleType } from '@prisma/client';

export class UpdateChaleDTO {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rooms?: string[];

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(ChaleType)
  unitType?: ChaleType;

  @IsOptional()
  @IsEnum(ChaleStatus)
  status?: ChaleStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  basePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxGuests?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
