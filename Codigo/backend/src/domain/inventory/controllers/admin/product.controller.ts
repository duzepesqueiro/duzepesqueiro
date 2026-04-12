import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  ProductListFilterDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateProductDto,
  UpdateStockDto,
  CreateProductDto,
  KardexFilterDto,
  KardexResponseDto,
  MovementHistoryDto,
} from '../../dto';
import { InventoryMovementService, ProductService } from '../../services';

@Controller('products')
@ApiTags('Inventory - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly movementService: InventoryMovementService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return this.productService.create(dto, user);
  }

  @Post(':id/image')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de imagem do produto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivo inválido' })
  async uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|gif)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        }),
    )
    file: any,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return this.productService.uploadImage(id, file, user);
  }

  @Post(':id/images')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de múltiplas imagens do produto (máx. 10)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Arquivos inválidos' })
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return this.productService.uploadImages(id, files, user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List products with pagination and filters' })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async list(@Query() filters: ProductListFilterDto): Promise<ProductListResponseDto> {
    return this.productService.list(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product by id' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productService.get(id);
  }

  @Get('sku/:sku')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product by sku' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getBySku(@Param('sku') sku: string): Promise<ProductResponseDto> {
    return this.productService.getBySku(sku);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    return this.productService.update(id, dto, user, user.role === UserRole.ADMIN);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.productService.delete(id, user, user.role === UserRole.ADMIN);
  }

  @Post(':id/stock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Adjust product stock and create kardex movement' })
  @ApiResponse({ status: 201, type: MovementHistoryDto })
  @ApiResponse({ status: 400, description: 'Invalid operation or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Concurrent update conflict' })
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: User,
  ): Promise<MovementHistoryDto> {
    return this.productService.adjustStock(id, dto, user);
  }

  @Get(':id/kardex')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get product kardex history' })
  @ApiResponse({ status: 200, type: KardexResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getKardex(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: KardexFilterDto,
  ): Promise<KardexResponseDto> {
    return this.movementService.kardexHistory(id, filters);
  }
}
