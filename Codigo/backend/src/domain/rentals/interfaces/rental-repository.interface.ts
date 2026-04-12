import { RentalStatus } from '@prisma/client';
import { CreateRentalDto, UpdateRentalDto } from '../dto/admin';
import { IRentalBooking } from './rental-booking.interface';
import { IRentalFilter } from './rental-filter.interface';
import { IRental } from './rental.interface';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface IRentalCreate extends CreateRentalDto {
  items?: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal?: number;
  }>;
}

export interface IRentalUpdate extends UpdateRentalDto {}

export interface IRentalRepository {
  create(data: IRentalCreate): Promise<IRental>;
  findById(id: string): Promise<IRental | null>;
  findByFilters(filters: IRentalFilter): Promise<IRental[]>;
  update(id: string, data: IRentalUpdate): Promise<IRental>;
  softDelete(id: string): Promise<void>;
  findAvailableItems(category?: string, dates?: DateRange): Promise<IRental[]>;
  countByStatus(status: RentalStatus): Promise<number>;
  countByPeriod(startDate: Date, endDate: Date): Promise<number>;
}

export interface IRentalBookingCreate
  extends Omit<
    IRentalBooking,
    'id' | 'createdAt' | 'updatedAt' | 'checkOutAt' | 'checkInAt'
  > {
  checkOutAt?: Date | null;
  checkInAt?: Date | null;
}
