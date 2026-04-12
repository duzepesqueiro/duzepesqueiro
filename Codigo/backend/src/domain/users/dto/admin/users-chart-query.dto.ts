import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class UsersChartQueryDto {
  @ApiPropertyOptional({ enum: ['week', 'month', 'year'], default: 'month' })
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  period?: 'week' | 'month' | 'year' = 'month';
}
