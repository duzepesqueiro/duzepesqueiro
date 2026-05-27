import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, Clock, MapPin, User as UserIcon, Users } from "lucide-react";
import { format as formatDate } from "date-fns";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api } from "@/lib/api";
import RatingStarsDisplay from "@/components/reviews/RatingStarsDisplay";
import type { ReviewDTO, ReviewSummaryDTO } from "@/types/reviews";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const REVIEWS_PAGE_SIZE = 10;

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewsPage, setReviewsPage] = useState(1);

  const { data: event, isLoading: isLoadingEvent } = useQuery<any>({
    queryKey: ["event-detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/events/${id}`);
      return data;
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: reviewsSummary } = useQuery<ReviewSummaryDTO>({
    queryKey: ["reviews-summary", "EVENT", id],
    queryFn: async () => {
      const { data } = await api.get("/api/reviews/summary", {
        params: { domain: "EVENT", targetId: id },
      });
      return {
        averageRating: Number(data?.averageRating ?? 0),
        reviewsCount: Number(data?.reviewsCount ?? 0),
      };
    },
    enabled: Boolean(id),
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
    queryKey: ["reviews-list", "EVENT", id, reviewsPage],
    queryFn: async () => {
      const { data } = await api.get("/api/reviews", {
        params: { domain: "EVENT", targetId: id, page: reviewsPage, limit: REVIEWS_PAGE_SIZE },
      });
      return Array.isArray(data) ? (data as ReviewDTO[]) : [];
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const dateLabel = useMemo(() => {
    if (!event?.eventDate) return "";
    try {
      return formatDate(new Date(event.eventDate), "dd/MM/yyyy");
    } catch {
      return "";
    }
  }, [event?.eventDate]);

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-background">
        <Header searchScope="events" />
        <div className="pt-28 pb-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto py-16">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header searchScope="events" />
        <div className="pt-28 pb-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <Button variant="ghost" className="mb-6" onClick={() => navigate("/events")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-muted-foreground">
              Evento não encontrado.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableSlots = Number(event?.availableSlots ?? 0);
  const totalSlots = Number(event?.totalSlots ?? 0);
  const currentAttendees = Math.max(0, totalSlots - availableSlots);

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

      <div className="pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" className="mb-6" onClick={() => navigate("/events")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <Card className="overflow-hidden border border-border/40 bg-card">
                <div className="relative aspect-video bg-muted">
                  {event?.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {availableSlots > 0 ? `${availableSlots} vagas` : "Esgotado"}
                    </Badge>
                    <Badge variant="outline">{String(event?.status ?? "")}</Badge>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h1 className="text-3xl font-bold leading-tight">{event.title}</h1>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span>{String(event?.eventTime ?? "")}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{String(event?.location ?? "")}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {currentAttendees} / {totalSlots} participantes
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/40 bg-card p-6 space-y-3">
                <h2 className="text-xl font-bold">Descrição</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(event?.description ?? "")}
                </p>
              </Card>

              <Card className="border border-border/40 bg-card p-6 space-y-3">
                <h2 className="text-xl font-bold">Regras</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(event?.rules ?? "")}
                </p>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <h2 className="text-xl font-bold mb-4">Avaliações</h2>

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
                        Ainda não há avaliações para este evento.
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
