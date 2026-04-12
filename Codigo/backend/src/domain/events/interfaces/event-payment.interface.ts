export interface IPaymentIntent {
  paymentId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  expiresAt: Date;
}

export interface IPaymentWebhook {
  paymentId: string;
  status: 'PAID' | 'FAILED' | 'CANCELLED';
  orderId: string;
  amount: number;
  paidAt?: Date;
  signature: string;
}

export interface IPaymentStatus {
  registrationId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | null;
  orderId?: string | null;
  paymentId?: string | null;
  amount?: number | null;
  paidAt?: Date | null;
}
