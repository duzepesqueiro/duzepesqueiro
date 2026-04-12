export enum MovementReason {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  RENTAL = 'RENTAL',
  RENTAL_RETURN = 'RENTAL_RETURN',
  TRANSFER = 'TRANSFER',
}

export type MovementReasonValue = `${MovementReason}`;
