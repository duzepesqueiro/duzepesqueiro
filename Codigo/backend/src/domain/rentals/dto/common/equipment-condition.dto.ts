import { ApiProperty } from '@nestjs/swagger';
import { ItemCondition } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class EquipmentConditionDto {
  @ApiProperty({ enum: ItemCondition, enumName: 'ItemCondition' })
  @IsEnum(ItemCondition)
  condition: ItemCondition;
}
