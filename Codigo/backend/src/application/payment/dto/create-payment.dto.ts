import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IdentificationDto {
  @ApiProperty({ example: 'CPF' })
  @IsString()
  type: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  number: string;
}

export class PayerDto {
  @ApiProperty({ example: 'cliente@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Maria' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ type: IdentificationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificationDto)
  identification?: IdentificationDto;
}

export class PaymentItemDto {
  @ApiProperty({ example: 'item-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Reserva DuZe' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Pagamento de reserva' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0.01)
  unitPrice: number;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 'order-1' })
  @IsString()
  entityId: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0.01)
  transactionAmount: number;

  @ApiProperty({ type: PayerDto })
  @ValidateNested()
  @Type(() => PayerDto)
  payer: PayerDto;

  @ApiProperty({ type: [PaymentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];
}
