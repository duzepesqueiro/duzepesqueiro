import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../../application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../../application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../application/auth/guards/roles.guard';
import {
  DashboardPeriodoQueryDTO,
  DashboardReservasStatsDTO,
  GraficoBarrasDTO,
  HospedagemKPIsDTO,
  MapaOcupacaoDTO,
  OcupacaoDiariaDTO,
  ReceitaChaleDTO,
} from '../../dto';
import { HospedagemMetricsService } from '../../services';

@Controller(['dashboard/hospedagem', 'api/dashboard/hospedagem'])
@ApiTags('Hosting - Dashboard')
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
export class DashboardController {
  constructor(private readonly metricsService: HospedagemMetricsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs gerais de hospedagem' })
  @ApiResponse({ status: 200, type: Object })
  async obterKPIs(@Query() query: DashboardPeriodoQueryDTO): Promise<{
    kpis: HospedagemKPIsDTO;
    taxaOcupacao: number;
    periodo: { startDate: Date; endDate: Date };
  }> {
    const periodo = this.metricsService.obterRangePorGranularidade(
      query.periodo ?? 'mes',
      query.dataReferencia ?? new Date(),
    );

    const [kpis, taxaOcupacao] = await Promise.all([
      this.metricsService.obterKPIsGeral(),
      this.metricsService.obterTaxaOcupacao(query.dataReferencia ?? new Date()),
    ]);

    return {
      kpis,
      taxaOcupacao,
      periodo,
    };
  }

  @Get('mapa')
  @ApiOperation({ summary: 'Mapa de ocupação de hospedagem' })
  @ApiResponse({ status: 200, type: Object })
  async obterMapa(
    @Query() query: DashboardPeriodoQueryDTO,
  ): Promise<MapaOcupacaoDTO | OcupacaoDiariaDTO[]> {
    const dataReferencia = query.dataReferencia ?? new Date();
    if (query.chaleId) {
      return this.metricsService.obterMapaOcupacao(
        query.chaleId,
        dataReferencia.getMonth() + 1,
        dataReferencia.getFullYear(),
      );
    }
    return this.metricsService.obterOcupacaoDiaria(dataReferencia);
  }

  @Get('receita')
  @ApiOperation({ summary: 'Dados de receita de hospedagem' })
  @ApiResponse({ status: 200, type: Object })
  async obterReceita(@Query() query: DashboardPeriodoQueryDTO): Promise<{
    receitaTotal: number;
    receitaPorChale: ReceitaChaleDTO[];
    graficoBarras: GraficoBarrasDTO;
    periodo: { startDate: Date; endDate: Date };
  }> {
    const periodo = this.metricsService.obterRangePorGranularidade(
      query.periodo ?? 'mes',
      query.dataReferencia ?? new Date(),
    );

    const [receitaTotal, receitaPorChale, graficoBarras] = await Promise.all([
      this.metricsService.obterReceitaTotal(periodo),
      this.metricsService.obterReceitaPorChale(periodo),
      this.metricsService.gerarDadosGraficoBarras(periodo),
    ]);

    const receitaFiltrada = query.chaleId
      ? receitaPorChale.filter((item) => item.chaletId === query.chaleId)
      : receitaPorChale;

    return {
      receitaTotal,
      receitaPorChale: receitaFiltrada,
      graficoBarras: query.chaleId
        ? {
            labels: receitaFiltrada.map((item) => item.chaletNome),
            receitas: receitaFiltrada.map((item) => item.receitaTotal),
            reservas: receitaFiltrada.map((item) => item.totalReservas),
          }
        : graficoBarras,
      periodo,
    };
  }

  @Get('reservas')
  @ApiOperation({ summary: 'Estatísticas de reservas' })
  @ApiResponse({ status: 200, type: Object })
  async obterEstatisticasReservas(
    @Query() query: DashboardPeriodoQueryDTO,
  ): Promise<DashboardReservasStatsDTO> {
    return this.metricsService.obterEstatisticasReservas(
      query.dataReferencia ?? new Date(),
    );
  }
}
