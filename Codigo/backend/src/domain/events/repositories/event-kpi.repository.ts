import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { IEventKpiRepository, IKpiGoal, IKpiGoalInput, KpiType } from '../interfaces';

@Injectable()
export class EventKpiRepository implements IEventKpiRepository {
  private readonly logger = new Logger(EventKpiRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async setGoal(data: IKpiGoalInput): Promise<IKpiGoal> {
    try {
      const prisma = this.prisma as any;
      const upserted = await prisma.eventKpiGoal.upsert({
        where: {
          kpiType_month_year: {
            kpiType: data.kpiType,
            month: data.month,
            year: data.year,
          },
        },
        create: {
          kpiType: data.kpiType,
          targetValue: data.targetValue,
          month: data.month,
          year: data.year,
        },
        update: {
          targetValue: data.targetValue,
        },
      });
      this.logger.log(
        `Meta KPI configurada tipo=${upserted.kpiType} mês=${upserted.month} ano=${upserted.year}`,
      );
      return this.mapGoal(upserted);
    } catch (error) {
      this.logger.error('Falha ao definir meta de KPI', error as Error);
      throw error;
    }
  }

  async getGoal(
    kpiType: KpiType,
    month: number,
    year: number,
  ): Promise<IKpiGoal | null> {
    try {
      const prisma = this.prisma as any;
      const row = await prisma.eventKpiGoal.findFirst({
        where: { kpiType, month, year },
      });
      return row ? this.mapGoal(row) : null;
    } catch (error) {
      this.logger.error(
        `Falha ao buscar meta KPI tipo=${kpiType} mês=${month} ano=${year}`,
        error as Error,
      );
      throw error;
    }
  }

  async getAllGoals(month: number, year: number): Promise<IKpiGoal[]> {
    try {
      const prisma = this.prisma as any;
      const rows = await prisma.eventKpiGoal.findMany({
        where: { month, year },
        orderBy: { kpiType: 'asc' },
      });
      return rows.map((row: any) => this.mapGoal(row));
    } catch (error) {
      this.logger.error(
        `Falha ao listar metas KPI mês=${month} ano=${year}`,
        error as Error,
      );
      throw error;
    }
  }

  async updateGoal(id: string, targetValue: number): Promise<IKpiGoal> {
    try {
      const prisma = this.prisma as any;
      const updated = await prisma.eventKpiGoal.update({
        where: { id },
        data: { targetValue },
      });
      this.logger.log(`Meta KPI atualizada id=${id}`);
      return this.mapGoal(updated);
    } catch (error) {
      this.logger.error(`Falha ao atualizar meta KPI id=${id}`, error as Error);
      throw error;
    }
  }

  async deleteGoal(id: string): Promise<void> {
    try {
      const prisma = this.prisma as any;
      await prisma.eventKpiGoal.delete({
        where: { id },
      });
      this.logger.warn(`Meta KPI removida id=${id}`);
    } catch (error) {
      this.logger.error(`Falha ao remover meta KPI id=${id}`, error as Error);
      throw error;
    }
  }

  private mapGoal(row: any): IKpiGoal {
    return {
      id: row.id,
      kpiType: row.kpiType,
      targetValue: Number(row.targetValue),
      month: row.month,
      year: row.year,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
