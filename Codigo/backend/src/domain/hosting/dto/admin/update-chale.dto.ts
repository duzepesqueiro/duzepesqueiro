import { ChaleStatus, ChaleType } from '@prisma/client';

export class UpdateChaleDTO {
  code?: string;
  name?: string;
  description?: string | null;
  amenities?: string[];
  rooms?: string[];
  notes?: string | null;
  unitType?: ChaleType;
  status?: ChaleStatus;
  basePrice?: number;
  maxGuests?: number;
  isActive?: boolean;
}
