import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { SalesAdminService } from '../../services';

class SalesAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'year'])
  range?: 'week' | 'month' | 'year';
}

class ListSalesOrdersQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : Number(value)))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'pendente', 'efetivada', 'cancelada'])
  status?: 'all' | 'pendente' | 'efetivada' | 'cancelada';

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'totalAmount', 'status'])
  sortField?: 'createdAt' | 'updatedAt' | 'totalAmount' | 'status';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

class CreateAdminSaleItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

class CreateAdminSaleDto {
  @IsString()
  userId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAdminSaleItemDto)
  items: CreateAdminSaleItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

class UpdateAdminSaleDto {
  @IsOptional()
  @IsString()
  note?: string;
}

@Controller(['admin/vendas', 'api/admin/vendas'])
@ApiTags('Sales - Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class SalesAdminController {
  constructor(
    private readonly salesAdminService: SalesAdminService,
    private readonly logsService: LogsService,
  ) {}

  @Get('analytics/kpis')
  @ApiOperation({ summary: 'KPIs do dashboard de vendas' })
  async getKpis(@Query() query: SalesAnalyticsQueryDto) {
    const range = query.range ?? 'month';
    const data = await this.salesAdminService.getKpis(range);
    return { message: 'KPIs carregados com sucesso', data };
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Desempenho do dashboard de vendas (gráfico)' })
  async getPerformance(@Query() query: SalesAnalyticsQueryDto) {
    const range = query.range ?? 'month';
    const data = await this.salesAdminService.getPerformance(range);
    return { message: 'Desempenho carregado com sucesso', data };
  }

  @Get('analytics/customers')
  @ApiOperation({ summary: 'Análise de clientes do dashboard de vendas' })
  async getCustomers(@Query() query: SalesAnalyticsQueryDto) {
    const range = query.range ?? 'month';
    const data = await this.salesAdminService.getCustomerAnalytics(range);
    return { message: 'Análise de clientes carregada com sucesso', data };
  }

  @Get('sales')
  @ApiOperation({ summary: 'Listar vendas (gestão)' })
  async listSales(@Query() query: ListSalesOrdersQueryDto) {
    const result = await this.salesAdminService.listSalesOrders(query);
    return { message: 'Vendas carregadas com sucesso', data: result };
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'Obter detalhes de uma venda' })
  async getSale(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesAdminService.getSaleById(id);
    return { message: 'Venda carregada com sucesso', data };
  }

  @Post('sales')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Criar venda manual (admin)' })
  async createSale(
    @Body() payload: CreateAdminSaleDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const data = await this.salesAdminService.createSale(payload);
    await this.logsService.info('sales', 'AdminSaleCreated', {
      adminId: currentUser.id,
      orderId: data.id,
    });
    return { message: 'Venda criada com sucesso', data };
  }

  @Patch('sales/:id')
  @ApiOperation({ summary: 'Atualizar venda (admin)' })
  async updateSale(@Param('id', ParseUUIDPipe) id: string, @Body() payload: UpdateAdminSaleDto) {
    const data = await this.salesAdminService.updateSale(id, payload);
    return { message: 'Venda atualizada com sucesso', data };
  }

  @Post('sales/:id/confirm')
  @ApiOperation({ summary: 'Confirmar venda (admin)' })
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.salesAdminService.confirmSale(id);
    return { message: 'Venda confirmada com sucesso', data };
  }

  @Post('sales/:id/cancel')
  @ApiOperation({ summary: 'Cancelar venda (admin)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actorUserId: string,
  ) {
    const data = await this.salesAdminService.cancelSale(id, actorUserId);
    return { message: 'Venda cancelada com sucesso', data };
  }
}
