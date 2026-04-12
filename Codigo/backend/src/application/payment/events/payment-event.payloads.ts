import { IPaymentDomain as PaymentDomain } from '../interfaces';

export interface BasePaymentEventPayload {
  paymentId: string;
  externalPaymentId: number;
  domain: PaymentDomain;
  entityId: string;
  timestamp: Date;
  triggeredBy: string;
}

export interface PaymentCreatedPayload extends BasePaymentEventPayload {
  amount: number;
  paymentMethod: string;
  installments: number;
  payer: { email: string; name?: string };
}

export interface PaymentApprovedPayload extends BasePaymentEventPayload {
  amount: number;
  netReceivedAmount: number;
  dateApproved: Date;
  authorizationCode?: string;
}

export interface PaymentRejectedPayload extends BasePaymentEventPayload {
  statusDetail: string;
  rejectionReason: string;
}

export interface PaymentRefundedPayload extends BasePaymentEventPayload {
  refundedAmount: number;
  originalAmount: number;
  refundId?: string;
}

export interface PaymentCancelledPayload extends BasePaymentEventPayload {}

export interface PaymentChargebackPayload extends BasePaymentEventPayload {}

export interface PaymentWebhookPayload {
  action: string;
  data: { id: string };
  type: string;
  dateCreated: Date;
}
