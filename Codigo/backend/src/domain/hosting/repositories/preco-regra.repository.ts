import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CreatePrecoRegraDTO, UpdatePrecoRegraDTO } from '../dto';

export type PrecoRegra = Prisma.HostingPricingRuleGetPayload<{
  include: {
    chalets: true;
  };
}>;

@Injectable()
export class PrecoRegraRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false): Promise<PrecoRegra[]> {
    return this.prisma.hostingPricingRule.findMany({
      where: {
        deletedAt: null,
        isActive: includeInactive ? undefined : true,
      },
      include: {
        chalets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<PrecoRegra | null> {
    return this.prisma.hostingPricingRule.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        chalets: true,
      },
    });
  }

  async findActiveRules(): Promise<PrecoRegra[]> {
    return this.prisma.hostingPricingRule.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        chalets: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findActiveRuleForChale(chaleId: string, date: Date): Promise<PrecoRegra | null> {
    return this.prisma.hostingPricingRule.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
        OR: [{ appliesToAll: true }, { chalets: { some: { chaletId: chaleId } } }],
      },
      include: {
        chalets: true,
      },
      orderBy: [{ appliesToAll: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findByChaleId(chaleId: string): Promise<PrecoRegra[]> {
    return this.prisma.hostingPricingRule.findMany({
      where: {
        deletedAt: null,
        OR: [{ appliesToAll: true }, { chalets: { some: { chaletId: chaleId } } }],
      },
      include: {
        chalets: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreatePrecoRegraDTO): Promise<PrecoRegra> {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    this.validateDateRange(startDate, endDate);

    const chaletIds = this.normalizeChaletIds(data.chaletIds);
    const appliesToAll = data.appliesToAll ?? false;
    if (!appliesToAll && chaletIds.length === 0) {
      throw new BadRequestException('At least one chalet must be informed when appliesToAll is false.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.cleanupStaleChaletLinks(tx, chaletIds);
      if (data.isActive ?? true) {
        await this.ensureNoActiveRuleConflict(tx, chaletIds, undefined, appliesToAll);
      }
      await this.ensureNoLinkedRuleConflict(tx, chaletIds);

      const created = await tx.hostingPricingRule.create({
        data: {
          name: data.name,
          ruleType: data.ruleType,
          percentage: new Prisma.Decimal(data.percentage),
          startDate,
          endDate,
          appliesToAll,
          isActive: data.isActive ?? true,
          createdById: data.createdById,
          updatedById: data.updatedById,
        },
      });

      if (!appliesToAll && chaletIds.length > 0) {
        await tx.hostingPricingRuleChalet.createMany({
          data: chaletIds.map((chaletId) => ({
            ruleId: created.id,
            chaletId,
          })),
        });
      }

      return (await tx.hostingPricingRule.findUnique({
        where: { id: created.id },
        include: { chalets: true },
      })) as PrecoRegra;
    });
  }

  async update(id: string, data: UpdatePrecoRegraDTO): Promise<PrecoRegra> {
    const existing = await this.prisma.hostingPricingRule.findFirst({
      where: { id, deletedAt: null },
      include: { chalets: true },
    });
    if (!existing) {
      throw new NotFoundException('Price rule not found.');
    }

    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    this.validateDateRange(startDate, endDate);

    const appliesToAll = data.appliesToAll ?? existing.appliesToAll;
    const chaletIds = data.chaletIds
      ? this.normalizeChaletIds(data.chaletIds)
      : existing.chalets.map((item) => item.chaletId);
    if (!appliesToAll && chaletIds.length === 0) {
      throw new BadRequestException('At least one chalet must be informed when appliesToAll is false.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.cleanupStaleChaletLinks(tx, chaletIds);
      const nextIsActive = data.isActive ?? existing.isActive;
      if (nextIsActive) {
        await this.ensureNoActiveRuleConflict(tx, chaletIds, id, appliesToAll);
      }
      await this.ensureNoLinkedRuleConflict(tx, chaletIds, id);

      await tx.hostingPricingRule.update({
        where: { id },
        data: {
          name: data.name,
          ruleType: data.ruleType,
          percentage: data.percentage !== undefined ? new Prisma.Decimal(data.percentage) : undefined,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          appliesToAll: data.appliesToAll,
          isActive: data.isActive,
          updatedById: data.updatedById,
        },
      });

      if (data.chaletIds || data.appliesToAll !== undefined) {
        await tx.hostingPricingRuleChalet.deleteMany({
          where: { ruleId: id },
        });

        if (!appliesToAll && chaletIds.length > 0) {
          await tx.hostingPricingRuleChalet.createMany({
            data: chaletIds.map((chaletId) => ({
              ruleId: id,
              chaletId,
            })),
          });
        }
      }

      return (await tx.hostingPricingRule.findUnique({
        where: { id },
        include: { chalets: true },
      })) as PrecoRegra;
    });
  }

  async toggleStatus(id: string): Promise<PrecoRegra> {
    const existing = await this.prisma.hostingPricingRule.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { chalets: true },
    });

    if (!existing) {
      throw new NotFoundException('Price rule not found.');
    }

    const nextStatus = !existing.isActive;
    if (nextStatus) {
      await this.ensureNoActiveRuleConflict(
        this.prisma,
        existing.chalets.map((item) => item.chaletId),
        existing.id,
        existing.appliesToAll,
      );
    }

    return this.prisma.hostingPricingRule.update({
      where: { id },
      data: {
        isActive: nextStatus,
      },
      include: { chalets: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.hostingPricingRule.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          isActive: false,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Price rule not found.');
      }

      // Remove links to fully release chalets for new rules after soft-delete.
      await tx.hostingPricingRuleChalet.deleteMany({
        where: { ruleId: id },
      });
    });
  }

  async hasActiveRuleForChale(chaleId: string, excludeRuleId?: string): Promise<boolean> {
    const count = await this.prisma.hostingPricingRule.count({
      where: {
        deletedAt: null,
        isActive: true,
        id: excludeRuleId ? { not: excludeRuleId } : undefined,
        OR: [{ appliesToAll: true }, { chalets: { some: { chaletId: chaleId } } }],
      },
    });

    return count > 0;
  }

  private normalizeChaletIds(ids?: string[]): string[] {
    if (!ids || ids.length === 0) {
      return [];
    }
    return Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0)));
  }

  private validateDateRange(startDate: Date, endDate: Date): void {
    if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date.');
    }
    if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid end date.');
    }
    if (endDate < startDate) {
      throw new BadRequestException('End date must be equal or greater than start date.');
    }
  }

  private async ensureNoActiveRuleConflict(
    tx: Prisma.TransactionClient | PrismaService,
    chaletIds: string[],
    excludeRuleId?: string,
    appliesToAll = false,
  ): Promise<void> {
    if (appliesToAll) {
      const conflict = await tx.hostingPricingRule.count({
        where: {
          deletedAt: null,
          isActive: true,
          id: excludeRuleId ? { not: excludeRuleId } : undefined,
        },
      });

      if (conflict > 0) {
        throw new BadRequestException('There is already an active price rule in the system.');
      }

      return;
    }

    for (const chaletId of chaletIds) {
      const conflict = await tx.hostingPricingRule.count({
        where: {
          deletedAt: null,
          isActive: true,
          id: excludeRuleId ? { not: excludeRuleId } : undefined,
          OR: [{ appliesToAll: true }, { chalets: { some: { chaletId } } }],
        },
      });
      if (conflict > 0) {
        throw new BadRequestException('There is already an active price rule for one of the selected chalets.');
      }
    }
  }

  private async ensureNoLinkedRuleConflict(
    tx: Prisma.TransactionClient,
    chaletIds: string[],
    excludeRuleId?: string,
  ): Promise<void> {
    if (chaletIds.length === 0) {
      return;
    }

    const linked = await tx.hostingPricingRuleChalet.findMany({
      where: {
        chaletId: { in: chaletIds },
        ruleId: excludeRuleId ? { not: excludeRuleId } : undefined,
        rule: {
          deletedAt: null,
        },
      },
      select: {
        chaletId: true,
      },
      take: 1,
    });

    if (linked.length > 0) {
      throw new BadRequestException('One of the selected chalets already has a linked price rule.');
    }
  }

  private async cleanupStaleChaletLinks(
    tx: Prisma.TransactionClient,
    chaletIds: string[],
  ): Promise<void> {
    if (!chaletIds.length) {
      return;
    }
    await tx.hostingPricingRuleChalet.deleteMany({
      where: {
        chaletId: { in: chaletIds },
        rule: {
          deletedAt: { not: null },
        },
      },
    });
  }
}
