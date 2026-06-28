import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight, Clock, ImageOff, MapPin, User as UserIcon, Users } from "lucide-react";
import { format as formatDate } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
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
const MAX_IMAGES = 10;

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewsPage, setReviewsPage] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageErrorByUrl, setImageErrorByUrl] = useState<Record<string, boolean>>({});

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

  const availableSlots = Number(event?.availableSlots ?? 0);
  const totalSlots = Number(event?.totalSlots ?? 0);
  const currentAttendees = Math.max(0, totalSlots - availableSlots);

  const carouselImages = useMemo(() => {
    if (Array.isArray(event?.images)) {
      return (event.images as unknown[])
        .filter((url) => typeof url === "string" && String(url).trim())
        .slice(0, MAX_IMAGES)
        .map((url) => String(url));
    }
    if (event?.imageUrl) {
      const url = String(event.imageUrl).trim();
      return url ? [url] : [];
    }
    return [];
  }, [event?.images, event?.imageUrl]);

  const hasCarousel = carouselImages.length > 1;
  const activeImageCandidate = carouselImages[activeImageIndex] ?? null;
  const activeImage =
    activeImageCandidate && !imageErrorByUrl[String(activeImageCandidate)]
      ? String(activeImageCandidate)
      : null;

  useEffect(() => {
    setActiveImageIndex(0);
    setImageErrorByUrl({});
  }, [event?.id]);

  useEffect(() => {
    if (activeImageIndex >= carouselImages.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, carouselImages.length]);

  const goToPreviousImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasCarousel) return;
    setActiveImageIndex((current) => (current - 1 + carouselImages.length) % carouselImages.length);
  };

  const goToNextImage = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!hasCarousel) return;
    setActiveImageIndex((current) => (current + 1) % carouselImages.length);
  };

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-background">
        <Header searchScope="events" />
        <div className="pt-28 pb-20">
          <div className="duze-container max-w-6xl py-16">
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
        <div className="pt-28 pb-20">
          <div className="duze-container max-w-6xl">
            <Button variant="ghost" className="mb-6 h-11" onClick={() => navigate("/events")}>
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

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

      <div className="pt-28 pb-20">
        <div className="duze-container max-w-6xl">
          <Button variant="ghost" className="mb-6 h-11" onClick={() => navigate("/events")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Card className="overflow-hidden border border-border/50 bg-card/90 backdrop-blur-sm">
                <div className="relative aspect-video bg-muted">
                  <AnimatePresence mode="wait">
                    {activeImage ? (
                      <motion.img
                        key={`${event.id}-${activeImageIndex}`}
                        src={activeImage}
                        alt={`${event.title} - imagem ${activeImageIndex + 1}`}
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.35 }}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() =>
                          setImageErrorByUrl((prev) => ({
                            ...prev,
                            [activeImage]: true,
                          }))
                        }
                      />
                    ) : (
                      <motion.div
                        key={`${event.id}-placeholder`}
                        initial={{ opacity: 0, scale: 1.02 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.01 }}
                        transition={{ duration: 0.35 }}
                        className="flex h-full w-full items-center justify-center bg-muted/50"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border bg-background/70">
                            <ImageOff className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <p className="text-xs">Sem imagem</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {hasCarousel && (
                    <>
                      <button
                        type="button"
                        onClick={goToPreviousImage}
                        className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
                        {activeImageIndex + 1}/{carouselImages.length}
                      </div>
                    </>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="shadow-sm">
                      {availableSlots > 0 ? `${availableSlots} vagas` : "Esgotado"}
                    </Badge>
                    <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
                      {String(event?.status ?? "")}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h1 className="font-display text-3xl font-semibold leading-tight">{event.title}</h1>

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

              <Card className="border border-border/50 bg-card/90 backdrop-blur-sm p-6 space-y-3">
                <h2 className="text-xl font-bold">Descrição</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(event?.description ?? "")}
                </p>
              </Card>

              <Card className="border border-border/50 bg-card/90 backdrop-blur-sm p-6 space-y-3">
                <h2 className="text-xl font-bold">Regras</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {String(event?.rules ?? "")}
                </p>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-6 lg:sticky lg:top-28">
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
