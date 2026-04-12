interface InventoryBaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface InventoryUpdatedPayload extends InventoryBaseEventPayload {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: 'sale' | 'rental' | 'return' | 'adjustment' | 'restock';
  referenceId?: string;
}

export interface InventoryLowStockPayload extends InventoryBaseEventPayload {
  productId: string;
  productName: string;
  currentQuantity: number;
  minimumQuantity: number;
}
