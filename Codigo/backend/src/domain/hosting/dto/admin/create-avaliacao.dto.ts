export class CreateAvaliacaoDTO {
  reservationId: string;
  chaletId: string;
  userId?: string;
  rating: number;
  comment?: string;
}
