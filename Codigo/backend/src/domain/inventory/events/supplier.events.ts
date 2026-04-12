export class SupplierCreatedEvent {
  constructor(
    public readonly supplierId: string,
    public readonly name: string,
    public readonly cnpj: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseOrderReceivedEvent {
  constructor(
    public readonly orderId: string,
    public readonly supplierId: string,
    public readonly items: Array<{
      productId: string;
      quantity: number;
      receivedQuantity: number;
    }>,
    public readonly totalAmount: number,
    public readonly isOnTime: boolean,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class PurchaseSuggestionGeneratedEvent {
  constructor(
    public readonly suggestions: Array<{
      productId: string;
      sku: string;
      name: string;
      currentQuantity: number;
      minimumLimit: number;
      suggestedQuantity: number;
      turnoverRate: string;
      priority: string;
    }>,
    public readonly timestamp: Date = new Date(),
  ) {}
}
