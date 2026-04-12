interface SalesBaseEventPayload {
  timestamp: Date;
  triggeredBy: string;
}

export interface OrderCreatedPayload extends SalesBaseEventPayload {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

export interface OrderPaidPayload extends SalesBaseEventPayload {
  orderId: string;
  userId: string;
  paymentId: string;
  amount: number;
}

export interface PaymentReceivedPayload extends SalesBaseEventPayload {
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
