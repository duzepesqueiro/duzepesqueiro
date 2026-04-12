import { ChaleType, PriceRuleType } from '@prisma/client';

export class PrecoRegraDTO {
  id: string;
  name: string;
  ruleType: PriceRuleType;
  percentage: number;
  startDate: Date;
  endDate: Date;
  appliesToAll: boolean;
  isActive: boolean;
  chaletIds: string[];
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PrecoRegraListDTO extends PrecoRegraDTO {}

export class PriceBreakdownDTO {
  chaletId: string;
  date: Date;
  basePrice: number;
  adjustedPrice: number;
  difference: number;
  appliedRuleId?: string | null;
  appliedRuleName?: string | null;
  appliedRuleType?: PriceRuleType | null;
  percentage?: number | null;
}

export class PriceSimulationDTO {
  chaletId: string;
  chaletCode: string;
  chaletName: string;
  chaletType: ChaleType;
  basePrice: number;
  adjustedPrice: number;
  difference: number;
  differencePercent: number;
  appliedRuleId?: string | null;
  appliedRuleName?: string | null;
}
