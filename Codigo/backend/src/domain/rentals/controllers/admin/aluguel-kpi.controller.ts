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
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../../../../application/auth/decorators/current-user.decorator';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import { LogsService } from '../../../../application/logs/services';
import { IsAfterDate } from '../../dto/common/validators';
import { AluguelKpiService } from '../../services/admin';

class DateRangeQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsAfterDate('startDate')
  endDate: string;
}

class UtilizationQueryDto {
  @IsOptional()
  @IsUUID()
  equipmentId?: string;
}

class PopularQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

class ComparisonQueryDto {
  @IsDateString()
  currentStartDate: string;

  @IsDateString()
  @IsAfterDate('currentStartDate')
  currentEndDate: string;

  @IsDateString()
  previousStartDate: string;

  @IsDateString()
  @IsAfterDate('previousStartDate')
  previousEndDate: string;
}

@Controller('admin/rentals/kpi')
@ApiTags('Aluguel - KPI Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@UseInterceptors(ClassSerializerInterceptor)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AluguelKpiController {
  constructor(
    private readonly aluguelKpiService: AluguelKpiService,
    private readonly logsService: LogsService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas gerais de aluguel' })
  @ApiResponse({ status: 200, description: 'Métricas retornadas com sucesso' })
  metrics(
    @CurrentUser('id') userId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    const period = {
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
    };
    void this.logsService.info('rental', 'AdminKpiMetricsRequest', { userId, period });
    return this.aluguelKpiService.getRentalMetrics(period);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Receita por período' })
  @ApiResponse({ status: 200, description: 'Receita retornada com sucesso' })
  revenue(
    @CurrentUser('id') userId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    void this.logsService.info('rental', 'AdminKpiRevenueRequest', { userId, startDate, endDate });
    return this.aluguelKpiService.getRevenueByPeriod(startDate, endDate);
  }

  @Get('utilization')
  @ApiOperation({ summary: 'Taxa de utilização' })
  @ApiResponse({ status: 200, description: 'Taxa de utilização retornada com sucesso' })
  utilization(
    @CurrentUser('id') userId: string,
    @Query() query: UtilizationQueryDto,
  ) {
    void this.logsService.info('rental', 'AdminKpiUtilizationRequest', { userId, equipmentId: query.equipmentId });
    return this.aluguelKpiService.getUtilizationRate(query.equipmentId);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Itens mais alugados' })
  @ApiResponse({ status: 200, description: 'Itens populares retornados com sucesso' })
  popular(
    @CurrentUser('id') userId: string,
    @Query() query: PopularQueryDto,
  ) {
    void this.logsService.info('rental', 'AdminKpiPopularRequest', { userId, limit: query.limit });
    return this.aluguelKpiService.getMostRentedItems(query.limit ?? 10);
  }

  @Get('cancellation')
  @ApiOperation({ summary: 'Taxa de cancelamento' })
  @ApiResponse({ status: 200, description: 'Taxa de cancelamento retornada com sucesso' })
  cancellation(@CurrentUser('id') userId: string) {
    void this.logsService.info('rental', 'AdminKpiCancellationRequest', { userId });
    return this.aluguelKpiService.getCancellationRate();
  }

  @Get('comparison')
  @ApiOperation({ summary: 'Comparação entre períodos' })
  @ApiResponse({ status: 200, description: 'Comparação retornada com sucesso' })
  comparison(
    @CurrentUser('id') userId: string,
    @Query() query: ComparisonQueryDto,
  ) {
    const current = {
      startDate: new Date(query.currentStartDate),
      endDate: new Date(query.currentEndDate),
    };
    const previous = {
      startDate: new Date(query.previousStartDate),
      endDate: new Date(query.previousEndDate),
    };
    void this.logsService.info('rental', 'AdminKpiComparisonRequest', { userId, current, previous });
    return this.aluguelKpiService.getComparison(current, previous);
  }
}

export { AluguelKpiController as RentalKpiController };
