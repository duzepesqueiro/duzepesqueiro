import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryStatus, PurchaseOrderStatus } from '../../../enums';

/**
 * DTO para atualização de status e metadados de ordem de compra.
 */
export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { message: 'O status da ordem de compra é inválido.' })
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus, { message: 'O status de entrega é inválido.' })
  deliveryStatus?: DeliveryStatus;

  @ApiPropertyOptional({ description: 'Data de entrega real em formato ISO-8601' })
  @IsOptional()
  @IsDateString({}, { message: 'A data de entrega real deve ser uma data válida.' })
  deliveredAt?: string;

  @ApiPropertyOptional({ description: 'Observação de atualização da ordem' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}

/**
 * DTO para recebimento parcial/total de item da ordem de compra.
 */
export class ReceivePurchaseOrderItemDto {
  @ApiProperty({ description: 'ID do item da ordem de compra' })
  @IsUUID('4', { message: 'O ID do item deve ser um UUID válido.' })
  itemId: string;

  @ApiProperty({ description: 'Quantidade efetivamente recebida', minimum: 0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade recebida deve ser um número.' })
  @Min(0, { message: 'A quantidade recebida não pode ser negativa.' })
  receivedQuantity: number;
}

/**
 * DTO para registrar recebimento de múltiplos itens da ordem de compra.
 */
export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto], description: 'Itens recebidos da ordem' })
  @IsArray({ message: 'Os itens recebidos devem ser informados em formato de lista.' })
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];

  @ApiPropertyOptional({ description: 'Observação geral do recebimento' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}
