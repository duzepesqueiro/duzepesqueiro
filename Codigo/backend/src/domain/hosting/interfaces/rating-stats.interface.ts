export interface RatingStats {
  average: number;
  total: number;
  ratings: Record<1 | 2 | 3 | 4 | 5, number>;
}
