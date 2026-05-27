import { useState, useMemo, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { EventCard } from "@/components/EventCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { EventFilters, EventFiltersState } from "@/components/EventFilters";
import { api, createReview, getReviewBySubject } from "@/lib/api";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isAuthenticated } from "@/lib/auth";
import ReviewModal from "@/components/reviews/ReviewModal";

const PAGE_SIZE = 9;
const MY_EVENTS_PAGE_SIZE = 3;

interface PaginatedEventsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserEventRegistration {
  registrationId: string;
  status: string;
  paymentStatus?: string | null;
  orderId?: string | null;
  registeredAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
}

const mapCapacityToApi = (value: string): number | undefined => {
  if (value === "small") return 50;
  if (value === "medium") return 150;
  if (value === "large") return 200;
  return undefined;
};

const mapStatusToApi = (value: string): "ALL" | "UPCOMING" | "CANCELLED" => {
  if (value === "cancelled") return "CANCELLED";
  if (value === "scheduled") return "UPCOMING";
  return "ALL";
};

const isEventPast = (dateValue?: string | Date, timeValue?: string): boolean => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  if (timeValue && /^\d{2}:\d{2}/.test(timeValue)) {
    const [hh, mm] = timeValue.split(":").map((v) => Number(v));
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      date.setHours(hh, mm, 0, 0);
    }
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime() < Date.now();
};

const Events = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>();
  // Rating via lateral toast, not dialog
  const [filters, setFilters] = useState<EventFiltersState>({
    name: "",
    date: undefined,
    capacity: "all",
    time: "",
    status: "all",
  });

  // Busca vinda da barra de pesquisa (Header), via parâmetro ?q
  const [searchQuery, setSearchQuery] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();

  const [isMyEventsOpen, setIsMyEventsOpen] = useState(false);
  const [myEventsPage, setMyEventsPage] = useState(1);
  const [isLoadingMyEvents, setIsLoadingMyEvents] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState<UserEventRegistration[]>([]);
  const [eventDetailsById, setEventDetailsById] = useState<Record<string, any>>({});
  const [reviewByRegistrationId, setReviewByRegistrationId] = useState<Record<string, boolean>>({});
  const [reviewTarget, setReviewTarget] = useState<{ registrationId: string; title: string } | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const hasActiveFilters = useMemo(() => {
    return !!(
      (searchQuery && searchQuery.trim()) ||
      (filters.name && filters.name.trim()) ||
      filters.date ||
      filters.capacity !== "all" ||
      (filters.time && filters.time !== "all") ||
      filters.status !== "all"
    );
  }, [searchQuery, filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextOpen = params.get("myEvents") === "1";
    setIsMyEventsOpen(nextOpen);
    if (nextOpen) setMyEventsPage(1);
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        const nameFilter = filters.name.trim();
        const globalQuery = searchQuery.trim();
        const response = await api.get<PaginatedEventsResponse>("/events", {
          params: {
            name: nameFilter || globalQuery || undefined,
            date: filters.date ? formatDate(filters.date, "dd/MM/yyyy") : undefined,
            capacity: mapCapacityToApi(filters.capacity),
            time: filters.time || undefined,
            status: mapStatusToApi(filters.status),
            page: currentPage,
            limit: PAGE_SIZE,
          },
        });

        if (!mounted) return;
        const raw = Array.isArray(response.data?.items) ? response.data.items : [];
        const data = raw.map((e: any) => ({
          ...e,
          image: e.imageUrl ?? "",
          date: e.eventDate ? formatDate(new Date(e.eventDate), "dd/MM/yyyy") : "",
          time: e.eventTime ?? "",
          currentAttendees: (e.totalSlots ?? 0) - (e.availableSlots ?? 0),
          totalCapacity: e.totalSlots ?? 0,
          description: e.description ?? "",
          rules: e.rules ?? "",
        }));

        setEvents(data);
        setTotalItems(Number(response.data?.total ?? 0));
        setPageSize(Number(response.data?.pageSize ?? PAGE_SIZE));
      } catch (error) {
        console.error("Erro ao buscar eventos paginados", error);
        if (!mounted) return;
        setEvents([]);
        setTotalItems(0);
        setPageSize(PAGE_SIZE);
      } finally {
        if (mounted) setIsLoadingEvents(false);
      }
    };

    loadEvents();
    return () => {
      mounted = false;
    };
  }, [searchQuery, filters, currentPage]);

  useEffect(() => {
    if (!isMyEventsOpen) return;
    if (!isAuthenticated()) {
      setMyRegistrations([]);
      return;
    }

    let mounted = true;
    const loadMyRegistrations = async () => {
      try {
        setIsLoadingMyEvents(true);
        const { data } = await api.get("/events/registrations");
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        setMyRegistrations(arr);
      } catch {
        if (!mounted) return;
        setMyRegistrations([]);
      } finally {
        if (mounted) setIsLoadingMyEvents(false);
      }
    };

    loadMyRegistrations();
    return () => {
      mounted = false;
    };
  }, [isMyEventsOpen]);

  const myEventsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(myRegistrations.length / MY_EVENTS_PAGE_SIZE));
  }, [myRegistrations.length]);

  useEffect(() => {
    if (!isMyEventsOpen) return;
    setMyEventsPage((page) => Math.min(page, myEventsTotalPages));
  }, [isMyEventsOpen, myEventsTotalPages]);

  const pagedRegistrations = useMemo(() => {
    const start = (myEventsPage - 1) * MY_EVENTS_PAGE_SIZE;
    return myRegistrations.slice(start, start + MY_EVENTS_PAGE_SIZE);
  }, [myRegistrations, myEventsPage]);

  useEffect(() => {
    if (!isMyEventsOpen) return;
    if (!isAuthenticated()) return;

    let mounted = true;
    const enrichPagedRegistrations = async () => {
      const regs = pagedRegistrations;

      const missingEventIds = regs
        .map((r) => String(r?.event?.id ?? ""))
        .filter((id) => id && !Object.prototype.hasOwnProperty.call(eventDetailsById, id));

      await Promise.all(
        missingEventIds.map(async (eventId) => {
          try {
            const { data } = await api.get(`/events/${eventId}`);
            if (!mounted) return;
            setEventDetailsById((prev) => ({ ...prev, [eventId]: data }));
          } catch {}
        }),
      );

      await Promise.all(
        regs
          .filter((r) => !Object.prototype.hasOwnProperty.call(reviewByRegistrationId, r.registrationId))
          .map(async (r) => {
            try {
              await getReviewBySubject({ domain: "EVENT", subjectId: r.registrationId });
              if (!mounted) return;
              setReviewByRegistrationId((prev) => ({ ...prev, [r.registrationId]: true }));
            } catch (err: any) {
              const status = err?.response?.status;
              if (status === 404) {
                if (!mounted) return;
                setReviewByRegistrationId((prev) => ({ ...prev, [r.registrationId]: false }));
              }
            }
          }),
      );
    };

    enrichPagedRegistrations();
    return () => {
      mounted = false;
    };
  }, [isMyEventsOpen, pagedRegistrations, eventDetailsById, reviewByRegistrationId]);

  const handleMyEventsOpenChange = (next: boolean) => {
    if (next) return;
    const params = new URLSearchParams(location.search);
    params.delete("myEvents");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
  };

  // Abre modal via parâmetro de query (eventId)
  useEffect(() => {
    let mounted = true;

    const openModalFromQuery = async () => {
      const params = new URLSearchParams(location.search);
      const eventIdParam = params.get("eventId");
      if (!eventIdParam) return;

      setSelectedEventId(eventIdParam);
      setIsModalOpen(true);

      const fromList = events.find((e) => String(e.id) === eventIdParam);
      if (fromList?.title) {
        setSelectedEventTitle(fromList.title);
        return;
      }

      try {
        const { data } = await api.get(`/events/${eventIdParam}`);
        if (!mounted) return;
        setSelectedEventTitle(data?.title);
      } catch {
        if (!mounted) return;
        setSelectedEventTitle(undefined);
      }
    };

    openModalFromQuery();
    return () => {
      mounted = false;
    };
  }, [location.search, events]);

  // Atualiza apenas a busca do carrossel pelo parâmetro (?q), sem mexer nos filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const handleRegister = (eventId: string) => {
    const event = events.find((e) => String(e.id) === eventId);
    setSelectedEventId(eventId);
    setSelectedEventTitle(event?.title);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

      <Sheet open={isMyEventsOpen} onOpenChange={handleMyEventsOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Meus eventos</SheetTitle>
            <SheetDescription>Eventos em que você está inscrito.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {!isAuthenticated() ? (
              <div className="text-sm text-muted-foreground">
                Faça login para visualizar seus eventos inscritos.
              </div>
            ) : isLoadingMyEvents ? (
              <div className="py-12">
                <LoadingSpinner />
              </div>
            ) : myRegistrations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Você ainda não possui inscrições em eventos.
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  {pagedRegistrations.map((registration) => {
                    const eventId = String(registration?.event?.id ?? "");
                    const details = eventId ? (eventDetailsById[eventId] ?? registration.event) : registration.event;
                    const didOccur = isEventPast(details?.eventDate, details?.eventTime);
                    const hasReviewInfo = Object.prototype.hasOwnProperty.call(
                      reviewByRegistrationId,
                      registration.registrationId,
                    );
                    const alreadyReviewed = hasReviewInfo ? reviewByRegistrationId[registration.registrationId] : false;
                    const canEvaluate = didOccur && hasReviewInfo && !alreadyReviewed;

                    const mapped = {
                      ...details,
                      image: details?.imageUrl ?? "",
                      date: details?.eventDate ? formatDate(new Date(details.eventDate), "dd/MM/yyyy") : "",
                      time: details?.eventTime ?? "",
                      currentAttendees: (details?.totalSlots ?? 0) - (details?.availableSlots ?? 0),
                      totalCapacity: details?.totalSlots ?? 0,
                      description: details?.description ?? "",
                      rules: details?.rules ?? "",
                    };

                    return (
                      <EventCard
                        key={registration.registrationId}
                        {...mapped}
                        onEvaluate={
                          canEvaluate
                            ? () => {
                                setReviewTarget({
                                  registrationId: registration.registrationId,
                                  title: String(details?.title ?? "Evento"),
                                });
                                setIsReviewModalOpen(true);
                              }
                            : undefined
                        }
                        onOpenDetails={eventId ? () => handleOpenDetails(eventId) : undefined}
                      />
                    );
                  })}
                </div>

                {myRegistrations.length > 0 && myEventsTotalPages > 1 && (
                  <Pagination className="mt-2">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(e) => {
                            e.preventDefault();
                            setMyEventsPage((page) => Math.max(1, page - 1));
                          }}
                          className={myEventsPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: myEventsTotalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={page === myEventsPage}
                            onClick={(e) => {
                              e.preventDefault();
                              setMyEventsPage(page);
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={(e) => {
                            e.preventDefault();
                            setMyEventsPage((page) => Math.min(myEventsTotalPages, page + 1));
                          }}
                          className={myEventsPage >= myEventsTotalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Hero Section */}
      <section className="pt-24 pb-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-bold">
            Próximos eventos
          </h1>
          <p>
            Descubra eventos e experiências incríveis. Inscreva-se agora para
            garantir sua vaga!
          </p>
        </div>

        {/* Filters Section */}
        <section className="px-4 md:px-8 pb-2 pt-10">
          <div className="max-w-7xl mx-auto">
            <EventFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
            />
          </div>
        </section>
      </section>

      {/* Events Carousel or Grid Section */}
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {isLoadingEvents ? (
            <div className="py-24">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                {hasActiveFilters ? "Resultados da busca" : "Eventos disponíveis"}
              </h2>
              {events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => (
                    <EventCard 
                      key={event.id} 
                      {...event} 
                      onRegister={() => handleRegister(event.id)} 
                      onOpenDetails={() => handleOpenDetails(event.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-lg">
                  Nenhum evento encontrado para os filtros selecionados.
                </div>
              )}
              {events.length > 0 && totalPages > 1 && (
                <Pagination className="mt-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.max(1, page - 1));
                        }}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((page) => Math.min(totalPages, page + 1));
                        }}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      <RegistrationFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialEventId={selectedEventId}
        initialEventTitle={selectedEventTitle}
      />

      <ReviewModal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        title={reviewTarget ? `Avaliar: ${reviewTarget.title}` : "Avaliar evento"}
        description="Conte como foi sua experiência neste evento."
        onSubmit={async ({ rating, comment }) => {
          if (!reviewTarget) return;
          try {
            await createReview({
              domain: "EVENT",
              subjectId: reviewTarget.registrationId,
              rating,
              comment,
            });
            setReviewByRegistrationId((prev) => ({ ...prev, [reviewTarget.registrationId]: true }));
            toast.success("Avaliação enviada com sucesso!");
          } catch (err: any) {
            const msg = err?.response?.data?.message;
            toast.error(msg || "Não foi possível enviar sua avaliação.");
            throw err;
          }
        }}
      />

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>
            &copy; 2025 Eventos Duzepesqueiro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Events;
