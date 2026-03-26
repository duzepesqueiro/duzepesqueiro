import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CancelPaymentDto,
  CreatePaymentDto,
  PaymentResponseDto,
  SearchPaymentDto,
  SearchPaymentResponseDto,
  UpdatePaymentDto,
} from '../dto';
import { PaymentExceptionFilter } from '../exceptions';
import {
  CreatePaymentService,
  GetPaymentService,
  SearchPaymentService,
  UpdatePaymentService,
} from '../services';

@Controller('payments')
@ApiTags('Payments')
@UseGuards(JwtAuthGuard)
@UseFilters(PaymentExceptionFilter)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly createPaymentService: CreatePaymentService,
    private readonly getPaymentService: GetPaymentService,
    private readonly searchPaymentService: SearchPaymentService,
    private readonly updatePaymentService: UpdatePaymentService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Criar novo pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 502, description: 'Erro no gateway de pagamento' })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: User,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`create payment requested by user=${user.id}`);
    return this.createPaymentService.execute(dto, user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar pagamentos' })
  @ApiResponse({
    status: 200,
    description: 'Pagamentos encontrados',
    type: SearchPaymentResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Não autorizado' })
  async search(@Query() params: SearchPaymentDto): Promise<SearchPaymentResponseDto> {
    this.logger.log(`search payments criteria=${JSON.stringify(params)}`);
    return this.searchPaymentService.execute(params);
  }

  @Get('reference/:reference')
  @ApiOperation({ summary: 'Obter pagamento por referência externa' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getByReference(
    @Param('reference') reference: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`get payment by reference=${reference}`);
    return this.getPaymentService.getByExternalReference(reference);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter pagamento por ID' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getById(@Param('id', ParseIntPipe) id: number): Promise<PaymentResponseDto> {
    this.logger.log(`get payment by external id=${id}`);
    return this.getPaymentService.execute(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar pagamento' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Atualização inválida' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`update payment requested id=${id}`);
    return this.updatePaymentService.execute(id, dto);
  }

  @Post(':id/capture')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Capturar pagamento autorizado' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async capture(@Param('id', ParseIntPipe) id: number): Promise<PaymentResponseDto> {
    this.logger.log(`capture payment requested id=${id}`);
    return this.updatePaymentService.capturePayment(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar pagamento' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: User,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`cancel payment requested id=${id} by user=${user.id}`);
    return this.updatePaymentService.cancelPayment(id, dto.reason);
  }
}
