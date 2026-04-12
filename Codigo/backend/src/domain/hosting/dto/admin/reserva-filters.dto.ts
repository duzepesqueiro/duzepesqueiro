import { ReservationStatus } from '@prisma/client';

export class ReservaFiltersDTO {
  status?: ReservationStatus;
  userId?: string;
  chaleId?: string;
  codigo?: string;
  checkinFrom?: string;
  checkinTo?: string;
}
