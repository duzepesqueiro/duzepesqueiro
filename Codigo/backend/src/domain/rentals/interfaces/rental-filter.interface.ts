import { RentalOrigin, RentalStatus } from '@prisma/client';

export interface IRentalFilter {
  userId?: string;
  status?: RentalStatus;
  origin?: RentalOrigin;
  rentalDateFrom?: Date | string;
  rentalDateTo?: Date | string;
  page?: number;
  limit?: number;
}
