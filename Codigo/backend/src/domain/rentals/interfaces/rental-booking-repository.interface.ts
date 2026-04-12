import { RentalStatus } from '@prisma/client';
import { IRentalBookingCreate } from './rental-repository.interface';
import { IRentalBooking } from './rental-booking.interface';

export interface IRentalBookingRepository {
  create(data: IRentalBookingCreate): Promise<IRentalBooking>;
  findById(id: string): Promise<IRentalBooking | null>;
  findByUserId(userId: string): Promise<IRentalBooking[]>;
  findByRentalId(rentalId: string): Promise<IRentalBooking[]>;
  findOverlappingBookings(
    rentalId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IRentalBooking[]>;
  updateStatus(id: string, status: RentalStatus): Promise<IRentalBooking>;
  countActiveBookings(): Promise<number>;
  createMany(items: IRentalBookingCreate[]): Promise<void>;
}
