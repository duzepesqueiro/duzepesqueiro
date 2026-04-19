import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ChaleStatus, ChaleType } from '@prisma/client';

export class CreateChaleDTO {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  notes?: string;

  @IsEnum(ChaleType)
  unitType: ChaleType;

  @IsOptional()
  @IsEnum(ChaleStatus)
  status?: ChaleStatus;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  basePrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  maxGuests: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
