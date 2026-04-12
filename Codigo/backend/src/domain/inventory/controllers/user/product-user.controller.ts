import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Public } from '../../../../application/auth/decorators/public.decorator';
import {
  UserProductListFilterDto,
  UserProductListResponseDto,
} from '../../dto/user';
import { ProductUserService } from '../../services';

@Controller('user/products')
@ApiTags('Inventory - User')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ProductUserController {
  constructor(private readonly productUserService: ProductUserService) {}

  @Get('sale')
  @Public()
  @ApiOperation({ summary: 'Listar produtos de venda para frontend do usuário' })
  @ApiResponse({ status: 200, type: UserProductListResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async listSale(
    @Query() filters: UserProductListFilterDto,
  ): Promise<UserProductListResponseDto> {
    return this.productUserService.listByStatus(ProductStatus.SALE, filters);
  }

  @Get('rental')
  @Public()
  @ApiOperation({ summary: 'Listar produtos de aluguel para frontend do usuário' })
  @ApiResponse({ status: 200, type: UserProductListResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async listRental(
    @Query() filters: UserProductListFilterDto,
  ): Promise<UserProductListResponseDto> {
    return this.productUserService.listByStatus(ProductStatus.RENTAL, filters);
  }

  @Get('hosting')
  @Public()
  @ApiOperation({ summary: 'Listar produtos de hospedagem para frontend do usuário' })
  @ApiResponse({ status: 200, type: UserProductListResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async listHosting(
    @Query() filters: UserProductListFilterDto,
  ): Promise<UserProductListResponseDto> {
    return this.productUserService.listByStatus(ProductStatus.HOSTING, filters);
  }

  @Get('event')
  @Public()
  @ApiOperation({ summary: 'Listar produtos de evento para frontend do usuário' })
  @ApiResponse({ status: 200, type: UserProductListResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async listEvent(
    @Query() filters: UserProductListFilterDto,
  ): Promise<UserProductListResponseDto> {
    return this.productUserService.listByStatus(ProductStatus.EVENT, filters);
  }
}
