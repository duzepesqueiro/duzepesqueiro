import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IPaymentDomain } from '../interfaces';
import { PayerDto, PaymentItemDto } from './create-payment.dto';

export class CreateCheckoutPreferenceDto {
  @ApiProperty({ enum: IPaymentDomain, example: IPaymentDomain.EVENT })
  @IsEnum(IPaymentDomain)
  domain: IPaymentDomain;

  @ApiProperty({ example: 'entity-123' })
  @IsString()
  entityId: string;

  @ApiProperty({ example: 'customer-id' })
  @IsString()
  userId: string;

  @ApiProperty({
    type: [PaymentItemDto],
    description: 'Itens da preferência de pagamento enviados para o Checkout Pro.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];

  @ApiProperty({ type: PayerDto })
  @ValidateNested()
  @Type(() => PayerDto)
  payer: PayerDto;

  @ApiPropertyOptional({ example: 'event_event-registration-id' })
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/pagamento/sucesso' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/pagamento/pendente' })
  @IsOptional()
  @IsString()
  pendingUrl?: string;

  @ApiPropertyOptional({ example: 'https://app.example.com/pagamento/falha' })
  @IsOptional()
  @IsString()
  failureUrl?: string;
}

export class CheckoutPreferenceResponseDto {
  @ApiProperty({ example: '123456789-abc-def', description: 'ID da preferência no Mercado Pago' })
  id: string;

  @ApiProperty({ example: '123456789-abc-def', description: 'Alias compatível com implementação anterior' })
  preferenceId: string;

  @ApiProperty({ example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...' })
  initPoint: string;

  @ApiProperty({ example: 'event_entity-123' })
  externalReference: string;

  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'BRL' })
  @IsString()
  currencyId: string;

  @ApiPropertyOptional({ example: 'payment-uuid-local' })
  @IsOptional()
  @IsString()
  localPaymentId?: string;
}
