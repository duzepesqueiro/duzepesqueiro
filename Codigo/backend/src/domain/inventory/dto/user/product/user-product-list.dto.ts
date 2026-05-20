

export class UserProductListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiPropertyOptional({ type: [String] })
  images?: string[];

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty({ enum: ProductCategory })
  category: ProductCategory;

  @ApiProperty({ enum: UnitMeasure })
  unitMeasure: UnitMeasure;

  @ApiProperty()
  salePrice: number;

  @ApiProperty()
  stockQuantity: number;
}

export class UserProductListResponseDto {
  @ApiProperty({ type: [UserProductListItemDto] })
  items: UserProductListItemDto[];

  @ApiProperty()
  total: number;

@ApiProperty()
  page: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  totalPages: number;
}
