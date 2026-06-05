import {
  Body,
  Controller,
  Get,
  NotImplementedException,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { CreateSalesOrderDto, ListSalesOrdersDto } from '../../dto/user';
import { SalesOrdersService } from '../../services';

@Controller(['user/sales/orders', 'api/user/sales/orders'])
@ApiTags('Sales - Orders (User)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class SalesOrdersController {
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly logsService: LogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar pedido de venda' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSalesOrderDto,
  ) {
    const order = await this.salesOrdersService.create(userId, dto);
    await this.logsService.info(
      'inventory',
      'SalesOrderCreated',
      { userId, orderId: order.id },
      order.id,
    );
    return { message: 'Pedido criado com sucesso', data: order };
  }

  @Get()
  @ApiOperation({ summary: 'Listar meus pedidos de venda (paginado)' })
  @ApiResponse({ status: 200, description: 'Pedidos listados com sucesso' })
  async list(
    @CurrentUser('id') userId: string,
    @Query() filters: ListSalesOrdersDto,
  ) {
    const result = await this.salesOrdersService.list(userId, filters);
    await this.logsService.info('inventory', 'SalesOrdersListed', {
      userId,
      total: result.total,
      page: result.page,
    });
    return { message: 'Pedidos listados com sucesso', data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes do pedido de venda' })
  @ApiResponse({ status: 200, description: 'Pedido retornado com sucesso' })
  async getById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.salesOrdersService.getById(userId, id);
    return { message: 'Pedido retornado com sucesso', data: order };
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pedido de venda' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado com sucesso' })
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.salesOrdersService.cancel(userId, id);
    await this.logsService.warn(
      'inventory',
      'SalesOrderCancelled',
      { userId, orderId: id },
      id,
    );
    return { message: 'Pedido cancelado com sucesso', data: order };
  }

  @Post(':id/payments/initiate')
  @ApiOperation({ summary: 'Iniciar pagamento do pedido (reservado para próxima integração)' })
  @ApiResponse({ status: 501, description: 'Não implementado' })
  async initiatePayment() {
    throw new NotImplementedException(
      'Integração de pagamento ainda não implementada para pedidos de venda',
    );
  }

  @Get(':id/payments/status')
  @ApiOperation({ summary: 'Consultar status do pagamento (reservado para próxima integração)' })
  @ApiResponse({ status: 501, description: 'Não implementado' })
  async paymentStatus() {
    throw new NotImplementedException(
      'Integração de pagamento ainda não implementada para pedidos de venda',
    );
  }
}
