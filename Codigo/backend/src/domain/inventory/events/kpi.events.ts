export class KpiUpdatedEvent {
  constructor(
    public readonly kpiType: string,
    public readonly value: number,
    public readonly percentageVariation: number | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class DashboardUpdatedEvent {
  constructor(
    public readonly data: {
      totalStockValue: number;
      stockTurnover: number;
      stockoutPercentage: number;
      totalLowStockItems: number;
      agedStockValue: number;
    },
    public readonly timestamp: Date = new Date(),
  ) {}
}
