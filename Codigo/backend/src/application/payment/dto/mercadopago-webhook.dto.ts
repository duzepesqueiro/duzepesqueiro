import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MercadoPagoWebhookDataDto {
  @ApiProperty({ example: '1234567890' })
  @IsString()
  id: string;
}

export class MercadoPagoWebhookDto {
  @ApiPropertyOptional({ example: 'payment.updated' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ example: 'payment' })
  @IsString()
  type: string;

  @ApiProperty({ type: MercadoPagoWebhookDataDto })
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data: MercadoPagoWebhookDataDto;

  @ApiPropertyOptional({ example: '2026-04-25T18:35:47.009Z' })
  @IsOptional()
  @IsDateString()
  dateCreated?: string;
}
