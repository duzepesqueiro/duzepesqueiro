export class ProductCreatedEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly status: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ProductUpdatedEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly changedFields: string[],
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class ProductDeletedEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class StockAdjustedEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly movementType: string,
    public readonly quantity: number,
    public readonly previousBalance: number,
    public readonly nextBalance: number,
    public readonly reason: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class LowStockAlertEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly currentQuantity: number,
    public readonly minimumLimit: number,
    public readonly supplierId: string,
    public readonly supplierName: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class StockoutEvent {
  constructor(
    public readonly productId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
