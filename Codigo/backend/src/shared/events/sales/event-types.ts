export const SalesEventTypes = {
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_APPROVED: 'payment.approved',
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_REJECTED: 'payment.rejected',
  PAYMENT_CANCELLED: 'payment.cancelled',
  PAYMENT_CHARGEBACK: 'payment.chargeback',
  PAYMENT_WEBHOOK_RECEIVED: 'payment.webhook.received',
  PAYMENT_RECONCILIATION_NEEDED: 'payment.reconciliation.needed',
} as const;

export type SalesEventType = (typeof SalesEventTypes)[keyof typeof SalesEventTypes];
