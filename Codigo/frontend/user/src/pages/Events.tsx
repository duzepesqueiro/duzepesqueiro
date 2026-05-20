import { useState, useMemo, useEffect } from "react";
import { format as formatDate } from "date-fns";
import { useLocation } from "react-router-dom";
import { EventCard } from "@/components/EventCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { RegistrationFormModal } from "@/components/RegistrationFormModal";
import { enqueueRatingPrompt, dequeueRatingPrompt } from "@/lib/ratings";
import { showRatingToast } from "@/components/RatingToast";
import { EventFilters, EventFiltersState } from "@/components/EventFilters";
import { api, submitUserRating } from "@/lib/api";
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

const PAGE_SIZE = 9;

interface PaginatedEventsResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  total: number;
  page: number;
  pageSize: number;
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

const Events = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>();
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

  // Abre modal via parâmetro de query (eventId)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventIdParam = params.get("eventId");
    const id = eventIdParam ? Number(eventIdParam) : undefined;
    if (id) {
      // if (!isAuthenticated()) {
      //   redirectToLogin(`register_event:${id}`);
      //   return;
      // }
      setSelectedEventId(id);
      setIsModalOpen(true);
    }
  }, [location.search]);

  // Atualiza apenas a busca do carrossel pelo parâmetro (?q), sem mexer nos filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || "";
    setSearchQuery(q);
  }, [location.search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
  }, [totalItems, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleRegister = (eventId: number) => {
    // If not authenticated, redirect to login and store pending action
    // if (!isAuthenticated()) {
    //   redirectToLogin(`register_event:${eventId}`);
    //   return;
    // }
    setSelectedEventId(eventId);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header searchScope="events" />

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
        onRegistered={({ eventId, eventTitle }) => {
          const name = eventTitle || "Evento";
          const prompt = { type: "event" as const, id: eventId, name };
          enqueueRatingPrompt(prompt);
          // Exibe após a confirmação de inscrição (leve atraso)
          setTimeout(() => {
            showRatingToast(prompt, {
              onSubmit: async (rating, comment) => {
                try {
                  await submitUserRating({ targetType: 'EVENT', targetId: prompt.id, rating, comment });
                  toast.success('Obrigado pela sua avaliação!');
                } catch (e) {
                  toast.error('Não foi possível enviar sua avaliação.');
                } finally {
                  dequeueRatingPrompt(prompt.id);
                }
              },
              onClose: () => dequeueRatingPrompt(prompt.id),
            });
          }, 300);
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
