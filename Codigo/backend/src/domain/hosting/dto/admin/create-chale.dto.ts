import { ChaleStatus, ChaleType } from '@prisma/client';

export class CreateChaleDTO {
  code?: string;
  name: string;
  description?: string;
  amenities?: string[];
  rooms?: string[];
  notes?: string;
  unitType: ChaleType;
  status?: ChaleStatus;
  basePrice: number;
  maxGuests: number;
  isActive?: boolean;
}
