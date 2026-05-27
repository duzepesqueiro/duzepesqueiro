import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { InventoryAdminFacadeService } from '../../services/inventory-admin-facade.service';

class InventoryItemFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

class SaleItemPayloadDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  currentStock?: number;

  @IsOptional()
  minThreshold?: number;

  @IsOptional()
  suggestedQuantity?: number;

  @IsOptional()
  unitCost?: number;

  @IsOptional()
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsString()
  lastRestocked?: string | null;
}

class RentalItemPayloadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  hourlyPrice?: number;

  @IsOptional()
  available?: number;

  @IsOptional()
  @IsString()
  image?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  fullDescription?: string | null;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;
}

@Controller('api/admin')
@ApiTags('Inventory - Admin Facade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  }),
)
export class InventoryAdminFacadeController {
  constructor(private readonly facade: InventoryAdminFacadeService) {}

  @Get('inventory/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'List inventory items for admin dashboard' })
  async getInventoryItems(@Query() filters: InventoryItemFilterDto) {
    return this.facade.getInventoryItems(filters.search);
  }

  @Get('estoque/kpis')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get inventory KPI cards for admin dashboard' })
  async getInventoryKpis(@Query() _filters: InventoryItemFilterDto) {
    return this.facade.getInventoryKpis();
  }

  @Get('estoque/heatmap')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get inventory heatmap data for admin dashboard' })
  async getInventoryHeatmap(@Query() _filters: InventoryItemFilterDto) {
    return this.facade.getInventoryHeatmap();
  }

  @Get('estoque/sugestoes-reposicao')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get reorder suggestion data for admin dashboard' })
  async getReorderSuggestions(@Query() _filters: InventoryItemFilterDto) {
    return this.facade.getReorderSuggestions();
  }

  @Get('estoque/fornecedores/performance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: 'Get supplier performance data for admin dashboard' })
  async getSupplierPerformance(@Query() _filters: InventoryItemFilterDto) {
    return this.facade.getSupplierPerformance();
  }

  @Post('vendas/items')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create sale product item from admin dashboard payload' })
  async createSaleItem(@Body() payload: SaleItemPayloadDto, @CurrentUser() user: User) {
    return this.facade.createSaleItem(payload, user);
  }

  @Put('vendas/items/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update sale product item from admin dashboard payload' })
  async updateSaleItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: SaleItemPayloadDto,
    @CurrentUser() user: User,
  ) {
    return this.facade.updateSaleItem(id, payload, user);
  }

  @Delete('vendas/items/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete sale product item from admin dashboard' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async deleteSaleItem(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    await this.facade.deleteSaleItem(id, user);
    return { success: true };
  }

  @Post('alugueis')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create rental inventory item from admin dashboard payload' })
  async createRentalItem(@Body() payload: RentalItemPayloadDto, @CurrentUser() user: User) {
    return this.facade.createRentalItem(payload, user);
  }

  @Put('alugueis/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update rental inventory item from admin dashboard payload' })
  async updateRentalItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: RentalItemPayloadDto,
    @CurrentUser() user: User,
  ) {
    return this.facade.updateRentalItem(id, payload, user);
  }
}
