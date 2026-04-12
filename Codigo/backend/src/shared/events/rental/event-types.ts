export const RentalEventTypes = {
  RENTAL_CREATED: 'rental.created',
  RENTAL_UPDATED: 'rental.updated',
  RENTAL_DELETED: 'rental.deleted',
  RENTAL_STATUS_CHANGED: 'rental.status_changed',
  RENTAL_BOOKING_CREATED: 'rental.booking_created',
  RENTAL_BOOKING_CANCELLED: 'rental.booking_cancelled',
  RENTAL_BOOKING_COMPLETED: 'rental.booking_completed',
  RENTAL_PAYMENT_COMPLETED: 'rental.payment_completed',
  RENTAL_PAYMENT_FAILED: 'rental.payment_failed',
  RENTAL_EQUIPMENT_VERIFIED: 'rental.equipment_verified',
  RENTAL_APPROVED: 'rental.approved',
  RENTAL_CANCELLED: 'rental.cancelled',
  RENTAL_PAID: 'rental.paid',
  RENTAL_RETURNED: 'rental.returned',
} as const;

export type RentalEventType = (typeof RentalEventTypes)[keyof typeof RentalEventTypes];
