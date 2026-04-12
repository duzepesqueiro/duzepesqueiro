import { RentalEventTypes } from '../../../shared/events/rental';

export enum RentalEvents {
  CREATED = 'rental.created',
  UPDATED = 'rental.updated',
  DELETED = 'rental.deleted',
  STATUS_CHANGED = 'rental.status_changed',
  BOOKING_CREATED = 'rental.booking_created',
  BOOKING_CANCELLED = 'rental.booking_cancelled',
  BOOKING_COMPLETED = 'rental.booking_completed',
  PAYMENT_COMPLETED = 'rental.payment_completed',
  PAYMENT_FAILED = 'rental.payment_failed',
  EQUIPMENT_VERIFIED = 'rental.equipment_verified',
}

export const AluguelEventName = {
  CREATED: RentalEvents.CREATED,
  UPDATED: RentalEvents.UPDATED,
  DELETED: RentalEvents.DELETED,
  STATUS_CHANGED: RentalEvents.STATUS_CHANGED,
  BOOKING_CREATED: RentalEvents.BOOKING_CREATED,
  BOOKING_CANCELLED: RentalEvents.BOOKING_CANCELLED,
  BOOKING_COMPLETED: RentalEvents.BOOKING_COMPLETED,
  PAYMENT_COMPLETED: RentalEvents.PAYMENT_COMPLETED,
  PAYMENT_FAILED: RentalEvents.PAYMENT_FAILED,
  EQUIPMENT_VERIFIED: RentalEvents.EQUIPMENT_VERIFIED,
  CONDITION_UPDATED: RentalEvents.EQUIPMENT_VERIFIED,
  PAID: RentalEventTypes.RENTAL_PAID,
  RETURNED: RentalEventTypes.RENTAL_RETURNED,
  CANCELLED: RentalEventTypes.RENTAL_CANCELLED,
} as const;

export class AluguelCreatedEvent {
  constructor(
    public readonly aluguelId: string,
    public readonly userId: string,
  ) {}
}

export class AluguelPaidEvent {
  constructor(
    public readonly aluguelId: string,
    public readonly userId: string,
    public readonly amount: number,
  ) {}
}
