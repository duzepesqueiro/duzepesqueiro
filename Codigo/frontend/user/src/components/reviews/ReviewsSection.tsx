import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon } from "lucide-react";
import { format as formatDate } from "date-fns";
import RatingStarsDisplay from "@/components/reviews/RatingStarsDisplay";
import type { ReviewDTO, ReviewDomain, ReviewSummaryDTO } from "@/types/reviews";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const REVIEWS_PAGE_SIZE = 10;

export const ReviewsSection = ({
  domain,
  targetId,
  title = "Avaliações",
}: {
  domain: ReviewDomain;
  targetId: string;
  title?: string;
}) => {
  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: reviewsSummary } = useQuery<ReviewSummaryDTO>({
    queryKey: ["reviews-summary", domain, targetId],
    queryFn: async () => {
      const { data } = await api.get("/api/reviews/summary", {
        params: { domain, targetId },
      });
      return {
        averageRating: Number(data?.averageRating ?? 0),
        reviewsCount: Number(data?.reviewsCount ?? 0),
      };
    },
    enabled: Boolean(domain && targetId),
    staleTime: 1000 * 60,
  });

  const totalReviewPages = useMemo(() => {
    const total = Number(reviewsSummary?.reviewsCount ?? 0);
    return Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));
  }, [reviewsSummary?.reviewsCount]);

  useEffect(() => {
    setReviewsPage((prev) => Math.min(Math.max(1, prev), totalReviewPages));
  }, [totalReviewPages]);

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery<ReviewDTO[]>({
    queryKey: ["reviews-list", domain, targetId, reviewsPage],
    queryFn: async () => {
      const { data } = await api.get("/api/reviews", {
        params: { domain, targetId, page: reviewsPage, limit: REVIEWS_PAGE_SIZE },
      });
      return Array.isArray(data) ? (data as ReviewDTO[]) : [];
    },
    enabled: Boolean(domain && targetId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RatingStarsDisplay value={Number(reviewsSummary?.averageRating ?? 0)} className="flex gap-1" />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold">
              {Number(reviewsSummary?.averageRating ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {Number(reviewsSummary?.reviewsCount ?? 0)} avaliações
            </span>
          </div>
        </div>
        {Number(reviewsSummary?.reviewsCount ?? 0) > 0 ? (
          <span className="text-xs text-muted-foreground">Mais recentes primeiro</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        {isLoadingReviews ? (
          <div className="space-y-3">
            <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Ainda não há avaliações.
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{review.authorName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {review.createdAt ? formatDate(new Date(review.createdAt), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <RatingStarsDisplay value={Number(review.rating ?? 0)} className="flex gap-1" />
                    </div>
                  </div>
                  {review.comment ? (
                    <p className={cn("mt-2 text-sm text-muted-foreground")}>
                      "{review.comment}"
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalReviewPages > 1 ? (
        <div className="mt-5 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                  className={reviewsPage === 1 ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
              {Array.from({ length: totalReviewPages }, (_, idx) => idx + 1)
                .slice(Math.max(0, reviewsPage - 2), Math.max(0, reviewsPage - 2) + 3)
                .map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === reviewsPage} onClick={() => setReviewsPage(p)}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setReviewsPage((p) => Math.min(totalReviewPages, p + 1))}
                  className={reviewsPage === totalReviewPages ? "pointer-events-none opacity-50" : undefined}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
};

