import { PaymentStatus, RentalOrigin, RentalPeriod, RentalStatus } from '@prisma/client';

export interface IRental {
  id: string;
  userId: string;
  origin: RentalOrigin;
  paymentStatus: PaymentStatus;
  status?: RentalStatus;
  totalAmount: number;
  rentalDate: Date;
  returnDate: Date;
  periodType: RentalPeriod;
  periodValue: number;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentId?: string | null;
  paidAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
