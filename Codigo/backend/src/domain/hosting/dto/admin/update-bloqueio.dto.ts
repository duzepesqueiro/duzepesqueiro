import { BlockReason } from '@prisma/client';

export class UpdateBloqueioDTO {
  chaletId?: string;
  dataInicio?: string;
  dataFim?: string;
  reason?: BlockReason | null;
  notes?: string | null;
  isActive?: boolean;
  createdById?: string | null;
}
