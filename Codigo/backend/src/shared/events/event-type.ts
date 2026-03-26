export const EventEvents = {
  CREATED: 'event.created',
  UPDATED: 'event.updated',
  DELETED: 'event.deleted',
  RESTORED: 'event.restored',
  STATUS_UPDATED: 'event.status.updated',
  REGISTERED: 'event.registered',
  REGISTRATION_CANCELLED: 'event.registration.cancelled',
  REGISTRATION_PAID: 'event.registration.paid',
  SOLD_OUT: 'event.sold_out',
} as const;

export type EventEventKey = (typeof EventEvents)[keyof typeof EventEvents];
