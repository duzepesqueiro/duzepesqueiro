import { BlockReason } from '@prisma/client';

export class CreateBloqueioDTO {
  chaletId: string;
  dataInicio: string;
  dataFim: string;
  reason?: BlockReason;
  notes?: string;
  isActive?: boolean;
  createdById?: string;
}
