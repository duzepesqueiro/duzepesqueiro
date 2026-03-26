import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
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
import { KpiPeriodQueryDto, SetKpiGoalDto } from '../../dto/admin';
import { AllKpisResponseDto, KpiGoalResponseDto, KpiResponseDto } from '../../dto/docs';
import { IAllKpis, IKpiGoal, IKpiResult } from '../../interfaces';
import { EventKpiService } from '../../services/admin';

@Controller('admin/events/kpis')
@ApiTags('Events - KPIs')
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
export class EventKpiController {
  constructor(
    private readonly eventKpiService: EventKpiService,
    private readonly logsService: LogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obter todos os KPIs de eventos do período' })
  @ApiResponse({ status: 200, description: 'KPIs retornados com sucesso', type: AllKpisResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getAllKpis(
    @CurrentUser('id') adminId: string,
    @Query() query: KpiPeriodQueryDto,
  ): Promise<IAllKpis> {
    const result = await this.eventKpiService.getAllKpis(query.month, query.year);
    void this.logsService.info('events', 'AdminKpisViewed', { adminId, ...query });
    return result;
  }

  @Get('active-events')
  @ApiOperation({ summary: 'Obter KPI de eventos ativos' })
  @ApiResponse({ status: 200, description: 'KPI retornado com sucesso', type: KpiResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getActiveEventsKpi(
    @CurrentUser('id') adminId: string,
    @Query() query: KpiPeriodQueryDto,
  ): Promise<IKpiResult> {
    const result = await this.eventKpiService.getActiveEventsKpi(query.month, query.year);
    void this.logsService.info('events', 'AdminKpiActiveEventsViewed', { adminId, ...query });
    return result;
  }

  @Get('registered-participants')
  @ApiOperation({ summary: 'Obter KPI de participantes registrados' })
  @ApiResponse({ status: 200, description: 'KPI retornado com sucesso', type: KpiResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getRegisteredParticipantsKpi(
    @CurrentUser('id') adminId: string,
    @Query() query: KpiPeriodQueryDto,
  ): Promise<IKpiResult> {
    const result = await this.eventKpiService.getRegisteredParticipantsKpi(
      query.month,
      query.year,
    );
    void this.logsService.info('events', 'AdminKpiRegisteredParticipantsViewed', {
      adminId,
      ...query,
    });
    return result;
  }

  @Get('registration-percentage')
  @ApiOperation({ summary: 'Obter KPI de percentual de inscrições' })
  @ApiResponse({ status: 200, description: 'KPI retornado com sucesso', type: KpiResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getRegistrationPercentageKpi(
    @CurrentUser('id') adminId: string,
    @Query() query: KpiPeriodQueryDto,
  ): Promise<IKpiResult> {
    const result = await this.eventKpiService.getRegistrationPercentageKpi(
      query.month,
      query.year,
    );
    void this.logsService.info('events', 'AdminKpiRegistrationPercentageViewed', {
      adminId,
      ...query,
    });
    return result;
  }

  @Get('sold-out-events')
  @ApiOperation({ summary: 'Obter KPI de eventos lotados' })
  @ApiResponse({ status: 200, description: 'KPI retornado com sucesso', type: KpiResponseDto })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async getSoldOutEventsKpi(
    @CurrentUser('id') adminId: string,
    @Query() query: KpiPeriodQueryDto,
  ): Promise<IKpiResult> {
    const result = await this.eventKpiService.getSoldOutEventsKpi(query.month, query.year);
    void this.logsService.info('events', 'AdminKpiSoldOutViewed', { adminId, ...query });
    return result;
  }

  @Post('goals')
  @ApiOperation({ summary: 'Definir meta para KPI de eventos' })
  @ApiResponse({ status: 201, description: 'Meta definida com sucesso', type: KpiGoalResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão (requer ADMIN)' })
  async setKpiGoal(
    @CurrentUser('id') adminId: string,
    @Body() dto: SetKpiGoalDto,
  ): Promise<IKpiGoal> {
    const result = await this.eventKpiService.setKpiGoal(dto);
    void this.logsService.info('events', 'AdminKpiGoalSet', { adminId, ...dto });
    return result;
  }
}
