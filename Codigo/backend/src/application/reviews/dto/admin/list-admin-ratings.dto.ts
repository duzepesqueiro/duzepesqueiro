import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

type TargetType = 'PRODUCT' | 'RENTAL' | 'EVENT' | 'HOSTING';

export class ListAdminRatingsQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;

  @IsOptional()
  @IsIn(['PRODUCT', 'RENTAL', 'EVENT', 'HOSTING'])
  targetType?: TargetType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;
}
