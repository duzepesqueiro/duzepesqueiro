import { ChaleStatus, ChaleType } from '@prisma/client';

export class ListChalesFiltersDTO {
  status?: ChaleStatus;
  unitType?: ChaleType;
  isActive?: boolean;
  minGuests?: number;
  search?: string;
}
