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
import { OrderPriority } from '../../../enums';

/**
 * DTO de item para criação de ordem de compra.
 */
export class PurchaseOrderItemInputDto {
  @ApiProperty({ description: 'ID do produto' })
  @IsUUID('4', { message: 'O ID do produto deve ser um UUID válido.' })
  productId: string;

  @ApiProperty({ description: 'Quantidade a solicitar', minimum: 0.001 })
  @Type(() => Number)
  @IsNumber({}, { message: 'A quantidade deve ser um número.' })
  @Min(0.001, { message: 'A quantidade mínima para solicitação é 0.001.' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Preço unitário negociado', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O preço unitário deve ser um número.' })
  @Min(0, { message: 'O preço unitário não pode ser negativo.' })
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Observação específica do item' })
  @IsOptional()
  @IsString({ message: 'A observação do item deve ser um texto.' })
  note?: string;
}

/**
 * DTO para criação de ordem de compra.
 */
export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID do fornecedor' })
  @IsUUID('4', { message: 'O ID do fornecedor deve ser um UUID válido.' })
  supplierId: string;

  @ApiProperty({ enum: OrderPriority, description: 'Prioridade da ordem' })
  @IsEnum(OrderPriority, { message: 'A prioridade informada é inválida.' })
  priority: OrderPriority;

  @ApiProperty({ description: 'Data prevista de entrega em formato ISO-8601' })
  @IsDateString({}, { message: 'A data prevista de entrega deve ser uma data válida.' })
  expectedDeliveryDate: string;

  @ApiProperty({ type: [PurchaseOrderItemInputDto], description: 'Itens da ordem de compra' })
  @IsArray({ message: 'Os itens devem ser informados em formato de lista.' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items: PurchaseOrderItemInputDto[];

  @ApiPropertyOptional({ description: 'Observação geral da ordem de compra' })
  @IsOptional()
  @IsString({ message: 'A observação deve ser um texto.' })
  note?: string;
}
