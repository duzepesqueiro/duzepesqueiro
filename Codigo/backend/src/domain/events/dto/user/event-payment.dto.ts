import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class InitiateEventPaymentDto {
  @ApiProperty({
    description: 'ID do evento a ser pago',
    example: 'e2f00ef2-a4c4-478e-b901-33f0f39b37a2',
  })
  @IsNotEmpty({ message: 'O eventId é obrigatório.' })
  @IsUUID('4', { message: 'O eventId deve ser um UUID válido.' })
  eventId: string;
}

export class EventPaymentWebhookDto {
  @ApiProperty({ example: '78392014' })
  @IsString({ message: 'paymentId deve ser um texto.' })
  @IsNotEmpty({ message: 'paymentId é obrigatório.' })
  paymentId: string;

  @ApiProperty({ enum: ['PAID', 'FAILED', 'CANCELLED'], example: 'PAID' })
  @IsIn(['PAID', 'FAILED', 'CANCELLED'], {
    message: 'status deve ser PAID, FAILED ou CANCELLED.',
  })
  status: 'PAID' | 'FAILED' | 'CANCELLED';

  @ApiProperty({ example: 'event_7e92f4af-06a3-497e-82c3-faf0fcd49527' })
  @IsString({ message: 'orderId deve ser um texto.' })
  @IsNotEmpty({ message: 'orderId é obrigatório.' })
  orderId: string;

  @ApiProperty({ example: 129.9 })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount deve ser um número.' })
  @Min(0, { message: 'amount deve ser maior ou igual a 0.' })
  amount: number;

  @ApiPropertyOptional({ example: '2026-03-24T13:22:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  paidAt?: Date;

  @ApiProperty({ example: '02b4e889e77f7a...' })
  @IsString({ message: 'signature deve ser um texto.' })
  @IsNotEmpty({ message: 'signature é obrigatória.' })
  signature: string;
}

export class RefundEventPaymentDto {
  @ApiProperty({ example: 'Solicitação do cliente' })
  @IsString({ message: 'reason deve ser um texto.' })
  @IsNotEmpty({ message: 'reason é obrigatório.' })
  reason: string;
}
