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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  CreateSupplierDto,
  ProductListFilterDto,
  ProductListResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from '../../dto';
import { SupplierService } from '../../services';
import { Transform, Type } from 'class-transformer';

class SupplierListFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;
}

class ValidateCnpjDto {
  @ApiProperty()
  @IsString()
  cnpj: string;
}

@Controller('suppliers')
@ApiTags('Inventory - Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({ status: 201, type: SupplierResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid CNPJ or duplicate data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: User,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List suppliers with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated supplier list' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async list(@Query() filters: SupplierListFilterDto): Promise<{
    items: SupplierResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.supplierService.list(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get supplier by id with metrics' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<SupplierResponseDto> {
    return this.supplierService.get(id);
  }

  @Get(':id/products')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List supplier products' })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: ProductListFilterDto,
  ): Promise<ProductListResponseDto> {
    return this.supplierService.listProducts(id, filters);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, type: SupplierResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: User,
  ): Promise<SupplierResponseDto> {
    return this.supplierService.update(id, dto, user, user.role === UserRole.ADMIN);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete supplier' })
  @ApiResponse({ status: 204, description: 'Supplier deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Supplier has related products' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.supplierService.delete(id, user, user.role === UserRole.ADMIN);
  }

  @Post('validate-cnpj')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate CNPJ' })
  @ApiResponse({ status: 200, description: 'CNPJ validation result' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async validateCnpj(@Body() dto: ValidateCnpjDto): Promise<{ valid: boolean }> {
    return { valid: this.supplierService.validateCnpj(dto.cnpj) };
  }
}
