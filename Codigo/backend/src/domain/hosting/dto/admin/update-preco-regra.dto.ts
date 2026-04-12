import { PriceRuleType } from '@prisma/client';

export class UpdatePrecoRegraDTO {
  name?: string;
  ruleType?: PriceRuleType;
  percentage?: number;
  startDate?: string;
  endDate?: string;
  appliesToAll?: boolean;
  chaletIds?: string[];
  isActive?: boolean;
  updatedById?: string | null;
}
