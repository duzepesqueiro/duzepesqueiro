export type ReviewDomain = 'HOSTING' | 'EVENT' | 'RENTAL' | 'SALES';

export type ReviewDTO = {
  id: string;
  domain: ReviewDomain;
  subjectId: string;
  targetId: string;
  targetName: string | null;
  rating: number;
  comment: string | null;
  authorName: string;
  createdAt: string;
};

export type ReviewSummaryDTO = {
  averageRating: number;
  reviewsCount: number;
};

