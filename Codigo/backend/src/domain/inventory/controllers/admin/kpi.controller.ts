import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StockKpiType, UserRole } from '@prisma/client';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  AgedStockKpiDto,
  InventoryDashboardDto,
  LowStockKpiDto,
  StockTurnoverKpiDto,
  StockoutKpiDto,
  TotalStockValueKpiDto,
} from '../../dto';
import { KpiService } from '../../services';

@Controller('kpis')
@ApiTags('Inventory - KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get complete inventory KPI dashboard' })
  @ApiResponse({ status: 200, type: InventoryDashboardDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDashboard(): Promise<InventoryDashboardDto> {
    return this.kpiService.getDashboard();
  }

  @Get('total-value')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get total stock value KPI' })
  @ApiResponse({ status: 200, type: TotalStockValueKpiDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getTotalValue(): Promise<TotalStockValueKpiDto> {
    return this.kpiService.calculateTotalStockValue();
  }

  @Get('turnover')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get stock turnover KPI' })
  @ApiResponse({ status: 200, type: StockTurnoverKpiDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStockTurnover(): Promise<StockTurnoverKpiDto> {
    return this.kpiService.calculateStockTurnover();
  }

  @Get('stockout')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get stockout frequency KPI' })
  @ApiResponse({ status: 200, type: StockoutKpiDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getStockoutFrequency(): Promise<StockoutKpiDto> {
    return this.kpiService.calculateStockoutFrequency();
  }

  @Get('low-stock')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get low stock KPI and item list' })
  @ApiResponse({ status: 200, type: LowStockKpiDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getLowStock(): Promise<LowStockKpiDto> {
    return this.kpiService.calculateLowStock();
  }

  @Get('aged')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get aged stock KPI' })
  @ApiResponse({ status: 200, type: AgedStockKpiDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAgedStock(
    @Query('days', ParseIntPipe) _days = 90,
  ): Promise<AgedStockKpiDto> {
    return this.kpiService.calculateAgedStock();
  }

  @Get('history/:type')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get KPI history by type and period' })
  @ApiResponse({ status: 200, description: 'KPI history' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getHistory(
    @Param('type', new ParseEnumPipe(StockKpiType)) type: StockKpiType,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<Array<{ referenceDate: Date; value: number; variation: number | null }>> {
    return this.kpiService.getKpiHistory(type, new Date(startDate), new Date(endDate));
  }

  @Post('recalculate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Recalculate all inventory KPIs' })
  @ApiResponse({ status: 202, description: 'KPI recalculation started' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async recalculate(): Promise<{ message: string }> {
    await this.kpiService.calculateAll();
    return { message: 'KPI recalculation started' };
  }
}
