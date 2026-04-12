import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { ProductListFilterDto } from '../dto';
import {
  UserProductListFilterDto,
  UserProductListResponseDto,
} from '../dto/user';
import { ProductRepository } from '../repositories';

@Injectable()
export class ProductUserService {
  constructor(private readonly productRepository: ProductRepository) {}

  async listByStatus(
    status: ProductStatus,
    filters: UserProductListFilterDto,
  ): Promise<UserProductListResponseDto> {
    const result = await this.productRepository.findAll({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      includeDeleted: false,
      status: status as any,
    } as ProductListFilterDto);

    return {
      items: result.items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: (item as any).description ?? undefined,
        image: (item as any).image ?? undefined,
        status: item.status as any,
        category: item.category as any,
        unitMeasure: item.unitMeasure as any,
        salePrice: Number(item.salePrice),
        stockQuantity: Number(item.stockQuantity),
      })),
      total: result.total,
      page: result.page,
      itemsPerPage: result.limit,
      totalPages: result.totalPages,
    };
  }
}
