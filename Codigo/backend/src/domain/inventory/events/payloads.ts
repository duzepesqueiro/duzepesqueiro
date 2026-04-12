export interface SaleItemEventPayload {
  productId: string;
  productType: 'SALE' | 'RENTAL' | string;
  quantity: number;
}

export interface SaleLifecycleEventPayload {
  saleId: string;
  items: SaleItemEventPayload[];
  user: { id: string; email?: string; role?: string };
}

export interface RentalItemEventPayload {
  productId: string;
  quantity: number;
}

export interface RentalLifecycleEventPayload {
  rentalId: string;
  items: RentalItemEventPayload[];
  user: { id: string; email?: string; role?: string };
}
