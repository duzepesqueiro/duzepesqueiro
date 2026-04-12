import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
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
import {
  MonthlyChartQueryDto,
  StatusDistributionQueryDto,
  TopEventsQueryDto,
  TrendChartQueryDto,
  WeeklyChartQueryDto,
  YearlyChartQueryDto,
} from '../../dto/admin';
import {
  MonthlyChartResponseDto,
  StatusDistributionResponseDto,
  TopEventResponseDto,
  TrendDataResponseDto,
  WeeklyChartResponseDto,
  YearlyChartResponseDto,
} from '../../dto/docs';
import {
  IMonthlyChartData,
  IStatusDistribution,
  ITopEvent,
  ITrendData,
  IWeeklyChartData,
  IYearlyChartData,
} from '../../interfaces';
import { EventChartService } from '../../services/admin';

@Controller('api/admin/events/charts')
@ApiTags('Events - Charts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class EventChartController {
  constructor(
    private readonly eventChartService: EventChartService,
    private readonly logsService: LogsService,
  ) {}

  @Get('weekly')
  @ApiOperation({ summary: 'Obter dados semanais para gráfico de eventos' })
  @ApiResponse({
    status: 200,
    description: 'Dados semanais retornados com sucesso',
    type: WeeklyChartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getWeeklyChartData(
    @CurrentUser('id') adminId: string,
    @Query() query: WeeklyChartQueryDto,
  ): Promise<IWeeklyChartData> {
    const referenceDate = query.referenceDate ? new Date(query.referenceDate) : undefined;
    const result = await this.eventChartService.getWeeklyChartData(referenceDate);
    void this.logsService.info('events', 'AdminChartWeeklyViewed', { adminId, ...query });
    return result;
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Obter dados mensais para gráfico de eventos' })
  @ApiResponse({
    status: 200,
    description: 'Dados mensais retornados com sucesso',
    type: MonthlyChartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getMonthlyChartData(
    @CurrentUser('id') adminId: string,
    @Query() query: MonthlyChartQueryDto,
  ): Promise<IMonthlyChartData> {
    const result = await this.eventChartService.getMonthlyChartData(query.year);
    void this.logsService.info('events', 'AdminChartMonthlyViewed', { adminId, ...query });
    return result;
  }

  @Get('yearly')
  @ApiOperation({ summary: 'Obter dados anuais para gráfico de eventos' })
  @ApiResponse({
    status: 200,
    description: 'Dados anuais retornados com sucesso',
    type: YearlyChartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getYearlyChartData(
    @CurrentUser('id') adminId: string,
    @Query() query: YearlyChartQueryDto,
  ): Promise<IYearlyChartData> {
    const result = await this.eventChartService.getYearlyChartData(
      query.startYear,
      query.endYear,
    );
    void this.logsService.info('events', 'AdminChartYearlyViewed', { adminId, ...query });
    return result;
  }

  @Get('status-distribution')
  @ApiOperation({ summary: 'Obter distribuição de status de eventos' })
  @ApiResponse({
    status: 200,
    description: 'Distribuição retornada com sucesso',
    type: StatusDistributionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getStatusDistribution(
    @CurrentUser('id') adminId: string,
    @Query() query: StatusDistributionQueryDto,
  ): Promise<IStatusDistribution> {
    const result = await this.eventChartService.getEventStatusDistribution(
      query.month,
      query.year,
    );
    void this.logsService.info('events', 'AdminChartStatusDistributionViewed', {
      adminId,
      ...query,
    });
    return result;
  }

  @Get('trend')
  @ApiOperation({ summary: 'Obter tendência de participantes' })
  @ApiResponse({ status: 200, description: 'Tendência retornada com sucesso', type: TrendDataResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getParticipantsTrend(
    @CurrentUser('id') adminId: string,
    @Query() query: TrendChartQueryDto,
  ): Promise<ITrendData> {
    const result = await this.eventChartService.getParticipantsTrend(query.months ?? 6);
    void this.logsService.info('events', 'AdminChartTrendViewed', { adminId, ...query });
    return result;
  }

  @Get('top-events')
  @ApiOperation({ summary: 'Obter top eventos por inscrições' })
  @ApiResponse({
    status: 200,
    description: 'Top eventos retornados com sucesso',
    type: TopEventResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getTopEvents(
    @CurrentUser('id') adminId: string,
    @Query() query: TopEventsQueryDto,
  ): Promise<ITopEvent[]> {
    const result = await this.eventChartService.getTopEvents(
      query.limit ?? 5,
      query.month,
      query.year,
    );
    void this.logsService.info('events', 'AdminChartTopEventsViewed', { adminId, ...query });
    return result;
  }
}
