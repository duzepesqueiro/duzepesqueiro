import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PriceRuleType } from '@prisma/client';
import { LogsService } from '../../../../application/logs/services';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreatePrecoRegraDTO,
  PrecoRegraDTO,
  PrecoRegraListDTO,
  PriceBreakdownDTO,
  PriceSimulationDTO,
  UpdatePrecoRegraDTO,
} from '../../dto';
import { PrecoRegra, PrecoRegraRepository } from '../../repositories';

@Injectable()
export class PrecoService {
  constructor(
    private readonly precoRegraRepository: PrecoRegraRepository,
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async criarRegra(data: CreatePrecoRegraDTO, adminId: string): Promise<PrecoRegraDTO> {
    this.validatePercentage(data.percentage);
    const created = await this.precoRegraRepository.create({
      ...data,
      createdById: adminId,
      updatedById: adminId,
    });

    await this.createPriceAudit('HOSTING_PRICE_RULE_CREATED', created.id, adminId, null, {
      percentage: Number(created.percentage),
      isActive: created.isActive,
    });

    if (created.isActive) {
      await this.recalculatePricesForRule(created, adminId);
    }

    return this.toPrecoRegraDTO(created);
  }

  async atualizarRegra(id: string, data: UpdatePrecoRegraDTO): Promise<PrecoRegraDTO> {
    if (data.percentage !== undefined) {
      this.validatePercentage(data.percentage);
    }

    const before = await this.precoRegraRepository.findById(id);
    if (!before) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }

    const updated = await this.precoRegraRepository.update(id, data);
    await this.createPriceAudit(
      'HOSTING_PRICE_RULE_UPDATED',
      updated.id,
      data.updatedById ?? undefined,
      {
        percentage: Number(before.percentage),
        isActive: before.isActive,
      },
      {
        percentage: Number(updated.percentage),
        isActive: updated.isActive,
      },
    );

    if (updated.isActive) {
      await this.recalculatePricesForRule(updated, data.updatedById ?? undefined);
    }

    return this.toPrecoRegraDTO(updated);
  }

  async ativarRegra(id: string): Promise<PrecoRegraDTO> {
    const current = await this.precoRegraRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }
    const updated = current.isActive ? current : await this.precoRegraRepository.toggleStatus(id);

    await this.recalculatePricesForRule(updated);
    await this.createPriceAudit('HOSTING_PRICE_RULE_ENABLED', id, undefined, { isActive: current.isActive }, { isActive: true });
    return this.toPrecoRegraDTO(updated);
  }

  async desativarRegra(id: string): Promise<PrecoRegraDTO> {
    const current = await this.precoRegraRepository.findById(id);
    if (!current) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }
    const updated = current.isActive ? await this.precoRegraRepository.toggleStatus(id) : current;

    await this.recalculatePricesForRule(updated);
    await this.createPriceAudit('HOSTING_PRICE_RULE_DISABLED', id, undefined, { isActive: current.isActive }, { isActive: false });
    return this.toPrecoRegraDTO(updated);
  }

  async removerRegra(id: string): Promise<void> {
    const existing = await this.precoRegraRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }
    await this.precoRegraRepository.delete(id);
    await this.createPriceAudit('HOSTING_PRICE_RULE_DELETED', id, undefined, {
      percentage: Number(existing.percentage),
      isActive: existing.isActive,
    });
  }

  async listarRegras(includeInactive = false): Promise<PrecoRegraListDTO[]> {
    const rules = await this.precoRegraRepository.findAll(includeInactive);
    return rules.map((rule) => this.toPrecoRegraDTO(rule));
  }

  async listarRegrasDoChale(chaleId: string): Promise<PrecoRegraListDTO[]> {
    const rules = await this.precoRegraRepository.findByChaleId(chaleId);
    return rules.map((rule) => this.toPrecoRegraDTO(rule));
  }

  async obterRegra(id: string): Promise<PrecoRegraDTO> {
    const rule = await this.precoRegraRepository.findById(id);
    if (!rule) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }
    return this.toPrecoRegraDTO(rule);
  }

  async calcularPrecoDiaria(chaleId: string, data: Date): Promise<PriceBreakdownDTO> {
    const chalet = await this.prisma.hostingChalet.findFirst({
      where: {
        id: chaleId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        basePrice: true,
      },
    });

    if (!chalet) {
      throw new NotFoundException('Chalé não encontrado.');
    }

    const basePrice = Number(chalet.basePrice);
    const activeRule = await this.precoRegraRepository.findActiveRuleForChale(chaleId, data);
    const adjustedPrice = activeRule
      ? this.applyRule(basePrice, activeRule.ruleType, Number(activeRule.percentage))
      : basePrice;

    return {
      chaletId: chaleId,
      date: data,
      basePrice,
      adjustedPrice,
      difference: Number((adjustedPrice - basePrice).toFixed(2)),
      appliedRuleId: activeRule?.id ?? null,
      appliedRuleName: activeRule?.name ?? null,
      appliedRuleType: activeRule?.ruleType ?? null,
      percentage: activeRule ? Number(activeRule.percentage) : null,
    };
  }

  async simularPrecos(data: Date): Promise<PriceSimulationDTO[]> {
    const chalets = await this.prisma.hostingChalet.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        unitType: true,
        basePrice: true,
      },
      orderBy: { name: 'asc' },
    });

    const result: PriceSimulationDTO[] = [];
    for (const chalet of chalets) {
      const breakdown = await this.calcularPrecoDiaria(chalet.id, data);
      result.push({
        chaletId: chalet.id,
        chaletCode: chalet.code,
        chaletName: chalet.name,
        chaletType: chalet.unitType,
        basePrice: Number(chalet.basePrice),
        adjustedPrice: breakdown.adjustedPrice,
        difference: breakdown.difference,
        differencePercent:
          Number(chalet.basePrice) > 0
            ? Number(((breakdown.difference / Number(chalet.basePrice)) * 100).toFixed(2))
            : 0,
        appliedRuleId: breakdown.appliedRuleId,
        appliedRuleName: breakdown.appliedRuleName,
      });
    }

    return result;
  }

  async aplicarRegraAChales(regraId: string, chaleIds: string[]): Promise<void> {
    const existing = await this.precoRegraRepository.findById(regraId);
    if (!existing) {
      throw new NotFoundException('Regra de preço não encontrada.');
    }
    const normalizedIds = Array.from(new Set(chaleIds.filter((id) => !!id?.trim())));
    if (normalizedIds.length === 0) {
      throw new BadRequestException('Informe ao menos um chalé para aplicar a regra.');
    }

    const updated = await this.precoRegraRepository.update(regraId, {
      appliesToAll: false,
      chaletIds: normalizedIds,
    });

    await this.recalculatePricesForRule(updated);
    await this.createPriceAudit(
      'HOSTING_PRICE_RULE_APPLIED_TO_CHALETS',
      regraId,
      undefined,
      { chaletIds: existing.chalets.map((item) => item.chaletId) },
      { chaletIds: normalizedIds },
    );
  }

  private validatePercentage(percentage: number): void {
    if (!Number.isFinite(percentage) || percentage < 0) {
      throw new BadRequestException('Percentual da regra deve ser maior ou igual a zero.');
    }
  }

  private applyRule(basePrice: number, ruleType: PriceRuleType, percentage: number): number {
    const ratio = percentage / 100;
    let adjusted = basePrice;
    if (ruleType === PriceRuleType.DISCOUNT) {
      adjusted = basePrice * (1 - ratio);
    } else {
      adjusted = basePrice * (1 + ratio);
    }
    if (adjusted < 0) {
      return 0;
    }
    return Number(adjusted.toFixed(2));
  }

  private async recalculatePricesForRule(rule: PrecoRegra, actorId?: string): Promise<void> {
    const today = new Date();
    const chaletIds = await this.resolveAffectedChaletIds(rule);

    for (const chaletId of chaletIds) {
      const breakdown = await this.calcularPrecoDiaria(chaletId, today);
      await this.createPriceAudit(
        'HOSTING_PRICE_RECALCULATED',
        undefined,
        actorId,
        null,
        {
          ruleId: rule.id,
          chaletId,
          basePrice: breakdown.basePrice,
          adjustedPrice: breakdown.adjustedPrice,
          difference: breakdown.difference,
          referenceDate: today.toISOString(),
        },
        chaletId,
      );
    }
  }

  private async resolveAffectedChaletIds(rule: PrecoRegra): Promise<string[]> {
    if (!rule.appliesToAll) {
      return rule.chalets.map((item) => item.chaletId);
    }

    const chalets = await this.prisma.hostingChalet.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    return chalets.map((item) => item.id);
  }

  private async createPriceAudit(
    action: string,
    pricingRuleId?: string,
    userId?: string,
    oldValue?: Record<string, unknown> | null,
    newValue?: Record<string, unknown> | null,
    chaletId?: string,
  ): Promise<void> {
    await this.prisma.hostingAuditLog.create({
      data: {
        action,
        pricingRuleId,
        chaletId,
        userId,
        oldValue: (oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    void this.logsService.info(
      'hosting',
      action,
      {
        pricingRuleId,
        chaletId,
        userId,
      },
      pricingRuleId,
    );
  }

  private toPrecoRegraDTO(rule: PrecoRegra): PrecoRegraDTO {
    return {
      id: rule.id,
      name: rule.name,
      ruleType: rule.ruleType,
      percentage: Number(rule.percentage),
      startDate: rule.startDate,
      endDate: rule.endDate,
      appliesToAll: rule.appliesToAll,
      isActive: rule.isActive,
      chaletIds: rule.chalets.map((item) => item.chaletId),
      createdById: rule.createdById,
      updatedById: rule.updatedById,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
