import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsUrl,
  Matches,
  IsInt,
  Max,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IPaymentDomain } from '../interfaces';

export class PaymentItemDto {
  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  pictureUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  unitPrice: number;
}

export class PayerIdentificationDto {
  @ApiProperty({ example: 'CPF' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  @Matches(/^(\d{11}|\d{14})$/, {
    message: 'number deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ)',
  })
  number: string;
}

export class PayerPhoneDto {
  @ApiProperty({ example: '11' })
  @IsString()
  @Matches(/^\d{2}$/, { message: 'areaCode deve conter 2 dígitos' })
  areaCode: string;

  @ApiProperty({ example: '999999999' })
  @IsString()
  @Matches(/^\d{8,9}$/, { message: 'number deve conter 8 ou 9 dígitos' })
  number: string;
}

export class PayerAddressDto {
  @ApiProperty()
  @IsString()
  zipCode: string;

  @ApiProperty()
  @IsString()
  streetName: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  streetNumber: number;
}

export class PayerDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ type: PayerIdentificationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerIdentificationDto)
  identification?: PayerIdentificationDto;

  @ApiPropertyOptional({ type: PayerPhoneDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerPhoneDto)
  phone?: PayerPhoneDto;

  @ApiPropertyOptional({ type: PayerAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayerAddressDto)
  address?: PayerAddressDto;
}

export class CreatePaymentDto {
  @ApiProperty({ enum: IPaymentDomain })
  @IsEnum(IPaymentDomain)
  domain: IPaymentDomain;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  transactionAmount: number;

  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  installments: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiPropertyOptional()
  @ValidateIf(
    ({ paymentMethodId }: CreatePaymentDto) => paymentMethodId !== 'pix',
  )
  @IsString()
  @IsNotEmpty()
  token?: string;

  @ApiProperty({ type: PayerDto })
  @ValidateNested()
  @Type(() => PayerDto)
  payer: PayerDto;

  @ApiProperty({ type: [PaymentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  notificationUrl?: string;

  @ApiProperty({ maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  externalReference: string;

  @ApiPropertyOptional({ type: 'object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
