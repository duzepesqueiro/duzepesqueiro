export interface BaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface OrderCreatedPayload extends BaseEventPayload {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

export interface OrderPaidPayload extends BaseEventPayload {
  orderId: string;
  userId: string;
  paymentId: string;
  amount: number;
}

export interface RentalCreatedPayload extends BaseEventPayload {
  rentalId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  startDate: Date;
  endDate: Date;
  total: number;
}

export interface PaymentReceivedPayload extends BaseEventPayload {
  paymentId: string;
  orderId?: string;
  rentalId?: string;
  eventId?: string;
  hostingId?: string;
  userId: string;
  amount: number;
  provider: 'mercadopago' | 'stripe';
  status: 'approved' | 'pending' | 'rejected';
}

export interface UserRegisteredPayload extends BaseEventPayload {
  userId: string;
  email: string;
  name: string;
  requiresEmailConfirmation: boolean;
  confirmationCode: string;
}

export interface UserActivatedPayload extends BaseEventPayload {
  userId: string;
  email: string;
  name: string;
}

export interface InventoryUpdatedPayload extends BaseEventPayload {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: 'sale' | 'rental' | 'return' | 'adjustment' | 'restock';
  referenceId?: string;
}

export interface InventoryLowStockPayload extends BaseEventPayload {
  productId: string;
  productName: string;
  currentQuantity: number;
  minimumQuantity: number;
}

export interface NotificationSendPayload extends BaseEventPayload {
  userId: string;
  type: 'email' | 'push' | 'websocket';
  template: string;
  data: Record<string, any>;
}

export interface HostingBookedPayload extends BaseEventPayload {
  hostingId: string;
  userId: string;
  accommodationId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  total: number;
}
