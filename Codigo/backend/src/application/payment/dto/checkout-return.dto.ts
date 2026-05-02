import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckoutReturnDto {
  @ApiPropertyOptional({ example: '155773724441' })
  @IsOptional()
  @IsString()
  payment_id?: string;

  @ApiPropertyOptional({ example: 'approved' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'hosting_5f2df1f4-03b9-485e-8bd5-ebc327c8bde9' })
  @IsOptional()
  @IsString()
  external_reference?: string;

  @ApiPropertyOptional({ example: '40299994705' })
  @IsOptional()
  @IsString()
  merchant_order_id?: string;

  @ApiPropertyOptional({ example: '3360219250-e65f427c-4442-46be-9924-528395b2176e' })
  @IsOptional()
  @IsString()
  preference_id?: string;
}
