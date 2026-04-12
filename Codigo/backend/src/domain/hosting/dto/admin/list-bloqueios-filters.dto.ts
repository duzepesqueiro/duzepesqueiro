import { BlockReason } from '@prisma/client';

export class ListBloqueiosFiltersDTO {
  chaleId?: string;
  isActive?: boolean;
  reason?: BlockReason;
  dataInicioFrom?: string;
  dataFimTo?: string;
}
