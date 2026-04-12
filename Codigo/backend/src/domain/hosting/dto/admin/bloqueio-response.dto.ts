import { BlockReason } from '@prisma/client';

export class BloqueioDTO {
  id: string;
  chaletId: string;
  startDate: Date;
  endDate: Date;
  reason?: BlockReason | null;
  notes?: string | null;
  isActive: boolean;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BloqueioListDTO extends BloqueioDTO {}
