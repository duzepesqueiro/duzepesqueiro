import { ChaleStatus, ChaleType } from '@prisma/client';

export class ChaleImagemDTO {
  id: string;
  imageUrl: string;
  imageKey: string;
  fileSizeBytes: number;
  mimeType?: string | null;
  position: number;
  createdAt: Date;
}

export class ChaleDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  amenities: string[];
  rooms: string[];
  notes?: string | null;
  unitType: ChaleType;
  status: ChaleStatus;
  basePrice: number;
  currentPrice?: number;
  maxGuests: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ChaleListDTO extends ChaleDTO {
  imagesCount: number;
}

export class ChaleDetailDTO extends ChaleDTO {
  images: ChaleImagemDTO[];
}

export class ChaleCalendarioDTO {
  chaletId: string;
  from: string;
  to: string;
  reservedDates: string[];
  unavailableDates: string[];
}
