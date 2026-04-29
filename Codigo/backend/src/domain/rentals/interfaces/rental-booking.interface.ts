import { ItemCondition, RentalStatus } from '@prisma/client';

export interface IRentalBooking {
  id: string;
  rentalId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  rentalDate?: Date | null;
  returnDate?: Date | null;
  checkOutAt?: Date | null;
  checkInAt?: Date | null;
  status: RentalStatus;
  returnCondition?: ItemCondition | null;
  conditionNotes?: string | null;
  plannedDuration?: number | null;
  actualDuration?: number | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
