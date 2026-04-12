export class AvaliacaoDTO {
  id: string;
  reservationId: string;
  chaletId: string;
  userId?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AvaliacaoListDTO extends AvaliacaoDTO {}

export class AvaliacaoDetailDTO extends AvaliacaoDTO {}

export class AvaliacaoStatsDTO {
  average: number;
  total: number;
  ratings: Record<1 | 2 | 3 | 4 | 5, number>;
}
