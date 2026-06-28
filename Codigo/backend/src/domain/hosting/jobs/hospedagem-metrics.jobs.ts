import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HostingEventTypes } from '../../../shared/events/hosting/event-types';
import { HospedagemMetricsService } from '../services';
import { runExclusiveJob } from './job-runner';

@Injectable()
export class HospedagemMetricsJobs implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: HospedagemMetricsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.executarJobAquecimentoCachesComLock();
    this.iniciarAgendador();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  @OnEvent(HostingEventTypes.HOSTING_BOOKED)
  @OnEvent(HostingEventTypes.HOSTING_CANCELLED)
  @OnEvent(HostingEventTypes.HOSTING_CHECKIN)
  @OnEvent(HostingEventTypes.HOSTING_CHECKOUT)
  async atualizarMetricasApósEvento(): Promise<void> {
    await this.metricsService.limparCacheMetricas();
    await this.executarJobAquecimentoCaches();
  }

  async executarJobAquecimentoCaches(): Promise<void> {
    const agora = new Date();
    const ranges = [
      this.metricsService.obterRangePorGranularidade('semana', agora),
      this.metricsService.obterRangePorGranularidade('mes', agora),
      this.metricsService.obterRangePorGranularidade('ano', agora),
    ];

    for (const range of ranges) {
      await this.metricsService.obterReceitaPorChale(range);
      await this.metricsService.gerarDadosGraficoBarras(range);
    }
  }

  private async executarJobAquecimentoCachesComLock(): Promise<void> {
    await runExclusiveJob(this.prisma, 'hosting.metrics.cache-warmup', async () => {
      await this.executarJobAquecimentoCaches();
    });
  }

  private iniciarAgendador(): void {
    const intervaloMs = Number(
      this.configService.get<number>('hosting.metricsJobIntervalMs') ?? 15 * 60 * 1000,
    );

    this.timer = setInterval(async () => {
      await this.executarJobAquecimentoCachesComLock();
    }, intervaloMs);
  }
}
