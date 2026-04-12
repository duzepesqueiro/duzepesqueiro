import {
  Body,
  Controller,
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
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { User, UserRole } from '@prisma/client';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderResponseDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../../dto';
import { PurchaseOrderService } from '../../services';

class PurchaseOrderListFilterDto {
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
  @IsUUID('4')
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

@Controller('purchase-orders')
@ApiTags('Inventory - Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create purchase order' })
  @ApiResponse({ status: 201, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: User,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List purchase orders with filters' })
  @ApiResponse({ status: 200, description: 'Paginated purchase orders' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async list(@Query() filters: PurchaseOrderListFilterDto): Promise<{
    items: PurchaseOrderResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.purchaseOrderService.list(filters);
  }

  @Get('suggestions')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate automatic purchase suggestions' })
  @ApiResponse({ status: 200, description: 'Purchase suggestion list' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateSuggestions(): Promise<{
    generatedAt: Date;
    totalSuggestions: number;
    items: unknown[];
  }> {
    return this.purchaseOrderService.generatePurchaseSuggestions();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get purchase order by id' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Purchase order not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.get(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update purchase order status' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: User,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.update(id, dto, user);
  }

  @Post(':id/receive')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Register purchase order item receiving' })
  @ApiResponse({ status: 200, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid receiving payload' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: User,
  ): Promise<PurchaseOrderResponseDto> {
    return this.purchaseOrderService.receive(id, dto, user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel purchase order' })
  @ApiResponse({ status: 204, description: 'Purchase order cancelled' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.purchaseOrderService.cancel(id, user);
  }
}
