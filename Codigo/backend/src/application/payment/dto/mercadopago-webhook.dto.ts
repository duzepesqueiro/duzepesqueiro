import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsObject, IsString, ValidateNested } from 'class-validator';

class MercadoPagoWebhookDataDto {
  @ApiProperty()
  @IsString()
  id: string;
}

export class MercadoPagoWebhookDto {
  @ApiProperty()
  @IsString()
  action: string;

  @ApiProperty({ type: MercadoPagoWebhookDataDto })
  @IsObject()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data: MercadoPagoWebhookDataDto;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  dateCreated: Date;
}
