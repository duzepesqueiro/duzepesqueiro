import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CancellationFeeDTO,
  CreatePoliticaDTO,
  PoliticaCancelamentoDTO,
  UpdatePoliticaDTO,
} from '../../dto';

@Injectable()
export class PoliticaCancelamentoService {
  private static readonly FREE_CANCELLATION_DAYS = 14;
  private static readonly PARTIAL_MIN_DAYS = 7;
  private static readonly PARTIAL_MAX_DAYS = 13;
  private static readonly PARTIAL_PENALTY_PERCENT = 20;
  private static readonly FULL_PENALTY_PERCENT = 50;

  constructor(private readonly prisma: PrismaService) {}

  async calcularMulta(reservaId: string): Promise<CancellationFeeDTO> {
    const reserva = await this.prisma.hostingReservation.findFirst({
      where: {
        id: reservaId,
        deletedAt: null,
      },
      select: {
        id: true,
        totalAmount: true,
        checkInDate: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    const fee = this.buildCancellationFee(Number(reserva.totalAmount), reserva.checkInDate);
    return {
      reservaId: reserva.id,
      ...fee,
    };
  }

  async calcularMultaManual(valorTotal: number, checkinData: Date): Promise<CancellationFeeDTO> {
    return this.buildCancellationFee(valorTotal, checkinData);
  }

  async listarPoliticas(): Promise<PoliticaCancelamentoDTO[]> {
    const policies = await this.prisma.hostingCancellationPolicy.findMany({
      orderBy: [{ isActive: 'desc' }, { effectiveFrom: 'desc' }],
    });

    return policies.map((policy) => this.toPoliticaDTO(policy));
  }

  async obterPoliticaAtiva(): Promise<PoliticaCancelamentoDTO> {
    const today = new Date();
    const policy = await this.prisma.hostingCancellationPolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    if (!policy) {
      throw new NotFoundException('Nenhuma política de cancelamento ativa foi encontrada.');
    }

    return this.toPoliticaDTO(policy);
  }

  async salvarDocumentoTermosAtivo(documentUrl: string, adminUserId: string): Promise<PoliticaCancelamentoDTO> {
    const now = new Date();
    const generatedVersion = `TERMS-${now.getTime()}`;
    const activePolicy = await this.prisma.hostingCancellationPolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

    if (!activePolicy) {
      const created = await this.prisma.hostingCancellationPolicy.create({
        data: {
          name: 'Política de Cancelamento - Termos Digitais',
          termsVersion: generatedVersion,
          termsContent: documentUrl,
          effectiveFrom: now,
          effectiveTo: null,
          isActive: true,
          freeCancellationDays: PoliticaCancelamentoService.FREE_CANCELLATION_DAYS,
          partialPenaltyFromDay: PoliticaCancelamentoService.PARTIAL_MIN_DAYS,
          partialPenaltyToDay: PoliticaCancelamentoService.PARTIAL_MAX_DAYS,
          partialPenaltyPercent: PoliticaCancelamentoService.PARTIAL_PENALTY_PERCENT,
          fullPenaltyPercent: PoliticaCancelamentoService.FULL_PENALTY_PERCENT,
          createdById: adminUserId,
        },
      });
      return this.toPoliticaDTO(created);
    }

    const updated = await this.prisma.hostingCancellationPolicy.update({
      where: { id: activePolicy.id },
      data: {
        termsContent: documentUrl,
        termsVersion: generatedVersion,
        createdById: adminUserId,
      },
    });

    return this.toPoliticaDTO(updated);
  }

  async criarPolitica(data: CreatePoliticaDTO): Promise<PoliticaCancelamentoDTO> {
    const created = await this.prisma.hostingCancellationPolicy.create({
      data: {
        name: data.name,
        termsVersion: data.termsVersion,
        termsContent: data.termsContent,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
        isActive: data.isActive ?? true,
        freeCancellationDays:
          data.freeCancellationDays ?? PoliticaCancelamentoService.FREE_CANCELLATION_DAYS,
        partialPenaltyFromDay:
          data.partialPenaltyFromDay ?? PoliticaCancelamentoService.PARTIAL_MIN_DAYS,
        partialPenaltyToDay:
          data.partialPenaltyToDay ?? PoliticaCancelamentoService.PARTIAL_MAX_DAYS,
        partialPenaltyPercent:
          data.partialPenaltyPercent ?? PoliticaCancelamentoService.PARTIAL_PENALTY_PERCENT,
        fullPenaltyPercent:
          data.fullPenaltyPercent ?? PoliticaCancelamentoService.FULL_PENALTY_PERCENT,
        createdById: data.createdById,
      },
    });

    return this.toPoliticaDTO(created);
  }

  async atualizarPolitica(id: string, data: UpdatePoliticaDTO): Promise<PoliticaCancelamentoDTO> {
    const existing = await this.prisma.hostingCancellationPolicy.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Política de cancelamento não encontrada.');
    }

    const updated = await this.prisma.hostingCancellationPolicy.update({
      where: { id },
      data: {
        name: data.name,
        termsVersion: data.termsVersion,
        termsContent: data.termsContent,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
        effectiveTo:
          data.effectiveTo === null
            ? null
            : data.effectiveTo
              ? new Date(data.effectiveTo)
              : undefined,
        isActive: data.isActive,
        freeCancellationDays: data.freeCancellationDays,
        partialPenaltyFromDay: data.partialPenaltyFromDay,
        partialPenaltyToDay: data.partialPenaltyToDay,
        partialPenaltyPercent: data.partialPenaltyPercent,
        fullPenaltyPercent: data.fullPenaltyPercent,
        createdById: data.createdById,
      },
    });

    return this.toPoliticaDTO(updated);
  }

  private buildCancellationFee(valorTotal: number, checkinData: Date): CancellationFeeDTO {
    const diasAntecedencia = this.calculateDaysBeforeCheckin(checkinData);
    const percentualMulta = this.resolvePenaltyPercent(diasAntecedencia);
    const valorMulta = Number((valorTotal * (percentualMulta / 100)).toFixed(2));
    const valorReembolso = Number((valorTotal - valorMulta).toFixed(2));

    return {
      valorTotal: Number(valorTotal.toFixed(2)),
      diasAntecedencia,
      percentualMulta,
      valorMulta,
      valorReembolso,
      regraAplicada: this.resolveRuleLabel(diasAntecedencia),
    };
  }

  private calculateDaysBeforeCheckin(checkinData: Date): number {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startCheckin = new Date(
      checkinData.getFullYear(),
      checkinData.getMonth(),
      checkinData.getDate(),
    );
    const diffMs = startCheckin.getTime() - startToday.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private resolvePenaltyPercent(diasAntecedencia: number): number {
    if (diasAntecedencia >= PoliticaCancelamentoService.FREE_CANCELLATION_DAYS) {
      return 0;
    }
    if (
      diasAntecedencia >= PoliticaCancelamentoService.PARTIAL_MIN_DAYS &&
      diasAntecedencia <= PoliticaCancelamentoService.PARTIAL_MAX_DAYS
    ) {
      return PoliticaCancelamentoService.PARTIAL_PENALTY_PERCENT;
    }
    return PoliticaCancelamentoService.FULL_PENALTY_PERCENT;
  }

  private resolveRuleLabel(diasAntecedencia: number): string {
    if (diasAntecedencia >= PoliticaCancelamentoService.FREE_CANCELLATION_DAYS) {
      return 'FREE_CANCELLATION';
    }
    if (
      diasAntecedencia >= PoliticaCancelamentoService.PARTIAL_MIN_DAYS &&
      diasAntecedencia <= PoliticaCancelamentoService.PARTIAL_MAX_DAYS
    ) {
      return 'PARTIAL_PENALTY_20_PERCENT';
    }
    return 'FULL_PENALTY_50_PERCENT';
  }

  private toPoliticaDTO(data: {
    id: string;
    name: string;
    freeCancellationDays: number;
    partialPenaltyFromDay: number;
    partialPenaltyToDay: number;
    partialPenaltyPercent: Prisma.Decimal | number | string;
    fullPenaltyPercent: Prisma.Decimal | number | string;
    termsVersion: string;
    termsContent: string;
    isActive: boolean;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PoliticaCancelamentoDTO {
    return {
      id: data.id,
      name: data.name,
      freeCancellationDays: data.freeCancellationDays,
      partialPenaltyFromDay: data.partialPenaltyFromDay,
      partialPenaltyToDay: data.partialPenaltyToDay,
      partialPenaltyPercent: Number(data.partialPenaltyPercent),
      fullPenaltyPercent: Number(data.fullPenaltyPercent),
      termsVersion: data.termsVersion,
      termsContent: data.termsContent,
      isActive: data.isActive,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
      createdById: data.createdById,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
