import { PriceRuleType } from '@prisma/client';

export class CreatePrecoRegraDTO {
  name: string;
  ruleType: PriceRuleType;
  percentage: number;
  startDate: string;
  endDate: string;
  appliesToAll?: boolean;
  chaletIds?: string[];
  isActive?: boolean;
  createdById?: string;
  updatedById?: string;
}
